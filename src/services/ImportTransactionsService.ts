import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const findCategoriesExist = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const findCategoriesExistTitle = findCategoriesExist.map(
      (category: Category) => category.title,
    );

    const mapCategoryNotExist = categories
      .filter(category => !findCategoriesExistTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategoriesObject = categoriesRepository.create(
      mapCategoryNotExist.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategoriesObject);

    const CategoriesResultAll = [
      ...newCategoriesObject,
      ...findCategoriesExist,
    ];

    const createTransactionsObject = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: CategoriesResultAll.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createTransactionsObject);

    await fs.promises.unlink(filePath);

    return createTransactionsObject;
  }
}

export default ImportTransactionsService;
