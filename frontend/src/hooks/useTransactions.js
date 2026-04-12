import { useState, useCallback } from 'react';
import { transactionsAPI } from '../utils/api';
import toast from 'react-hot-toast';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, current_page: 1 });

  const fetchTransactions = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await transactionsAPI.list(params);
      setTransactions(res.data.transactions);
      setPagination({ total: res.data.total, pages: res.data.pages, current_page: res.data.current_page });
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTransaction = useCallback(async (data) => {
    const res = await transactionsAPI.create(data);
    toast.success('Transaction created! Awaiting counterparty confirmation.');
    return res.data.transaction;
  }, []);

  const confirmTransaction = useCallback(async (id) => {
    const res = await transactionsAPI.confirm(id);
    toast.success('Transaction confirmed!');
    setTransactions(prev => prev.map(t => t.id === id ? res.data.transaction : t));
    return res.data.transaction;
  }, []);

  const rejectTransaction = useCallback(async (id, reason) => {
    const res = await transactionsAPI.reject(id, reason);
    toast.success('Transaction rejected.');
    setTransactions(prev => prev.map(t => t.id === id ? res.data.transaction : t));
    return res.data.transaction;
  }, []);

  return { transactions, loading, pagination, fetchTransactions, createTransaction, confirmTransaction, rejectTransaction };
};