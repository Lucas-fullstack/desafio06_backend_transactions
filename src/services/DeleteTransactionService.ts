import { Request } from 'express-serve-static-core';

import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const transaction = await transactionRepository.findOne(id);
    if (!transaction) {
      throw new AppError('Transcation does not exist');
    }

    await transactionRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
