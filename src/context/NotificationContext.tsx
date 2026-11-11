import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type NotificationType = 'expense_added' | 'settlement_confirmed' | 'receipt_scanned' | 'payment_reminder';

export interface SplitSnapNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  groupName: string;
  amountText?: string;
  actorName: string;
  actorAvatar?: string;
  timestamp: string;
  isRead: boolean;
  groupId?: string;
  actionType?: 'settle' | 'group' | 'expense';
}

export interface ActiveToast {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  amountText?: string;
  groupName?: string;
  createdAt: number;
  durationMs: number;
}

interface NotificationContextType {
  notifications: SplitSnapNotification[];
  toasts: ActiveToast[];
  unreadCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  notify: (
    notification: Omit<SplitSnapNotification, 'id' | 'timestamp' | 'isRead'>,
    showToast?: boolean
  ) => void;
  dismissToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  simulateIncomingActivity: () => void;
}

const INITIAL_NOTIFICATIONS: SplitSnapNotification[] = [
  {
    id: 'notif_init_1',
    type: 'settlement_confirmed',
    title: 'Settlement Confirmed',
    message: 'Aryan Gupta confirmed your PayPal Sandbox payment of $9.41 USD (₹800.00) for the Manali bus tickets.',
    groupName: 'Manali Trip',
    amountText: '₹800.00',
    actorName: 'Aryan Gupta',
    actorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    timestamp: '5m ago',
    isRead: false,
    groupId: 'grp_manali_2026',
    actionType: 'group',
  },
  {
    id: 'notif_init_2',
    type: 'expense_added',
    title: 'New Expense Added',
    message: 'Aditya Sharma added "Dinner" (₹1,200.00) split equally among 6 members.',
    groupName: 'Manali Trip',
    amountText: '₹1,200.00',
    actorName: 'Aditya Sharma',
    actorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    timestamp: '2h ago',
    isRead: false,
    groupId: 'grp_manali_2026',
    actionType: 'expense',
  },
  {
    id: 'notif_init_3',
    type: 'expense_added',
    title: 'Expense Split Published',
    message: 'You added "Hotel (2 Nights)" (₹6,000.00) in Manali Trip. 5 members owe you ₹1,000 each.',
    groupName: 'Manali Trip',
    amountText: '₹6,000.00',
    actorName: 'Kushagra (You)',
    actorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    timestamp: '1d ago',
    isRead: true,
    groupId: 'grp_manali_2026',
    actionType: 'group',
  },
  {
    id: 'notif_init_4',
    type: 'expense_added',
    title: 'Snack Bill Recorded',
    message: 'You added "Campus Snacks & Shakes" (₹850.00) in College Food.',
    groupName: 'College Food',
    amountText: '₹850.00',
    actorName: 'Kushagra (You)',
    actorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    timestamp: '2d ago',
    isRead: true,
    groupId: 'grp_college_food',
    actionType: 'group',
  },
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<SplitSnapNotification[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [simIndex, setSimIndex] = useState(0);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notify = useCallback(
    (
      data: Omit<SplitSnapNotification, 'id' | 'timestamp' | 'isRead'>,
      showToast: boolean = true
    ) => {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newNotification: SplitSnapNotification = {
        ...data,
        id: notifId,
        timestamp: 'Just now',
        isRead: false,
      };

      setNotifications(prev => [newNotification, ...prev]);

      if (showToast) {
        const toastId = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const duration = 5000;
        const newToast: ActiveToast = {
          id: toastId,
          type: data.type,
          title: data.title,
          message: data.message,
          amountText: data.amountText,
          groupName: data.groupName,
          createdAt: Date.now(),
          durationMs: duration,
        };

        setToasts(prev => [newToast, ...prev.slice(0, 3)]); // Keep max 4 concurrent toasts

        setTimeout(() => {
          dismissToast(toastId);
        }, duration);
      }
    },
    [dismissToast]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Demo simulator for judges/testers
  const simulateIncomingActivity = useCallback(() => {
    const simulations = [
      {
        type: 'settlement_confirmed' as const,
        title: 'PayPal Sandbox Settlement Received',
        message: 'Rohan Verma captured $5.00 USD via PayPal Sandbox for College Food.',
        groupName: 'College Food',
        amountText: '₹425.00',
        actorName: 'Rohan Verma',
        actorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
        actionType: 'settle' as const,
        groupId: 'grp_college_food',
      },
      {
        type: 'expense_added' as const,
        title: 'New Expense Added',
        message: 'Diya Patel added "Solang Valley Snow Tubing" (₹1,800.00) in Manali Trip.',
        groupName: 'Manali Trip',
        amountText: '₹1,800.00',
        actorName: 'Diya Patel',
        actorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        actionType: 'expense' as const,
        groupId: 'grp_manali_2026',
      },
      {
        type: 'settlement_confirmed' as const,
        title: 'Settlement Confirmed',
        message: 'Priya Nair marked ₹400.00 electricity bill as settled via PhonePe.',
        groupName: 'Flat & Utilities',
        amountText: '₹400.00',
        actorName: 'Priya Nair',
        actorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
        actionType: 'settle' as const,
        groupId: 'grp_flat_utilities',
      },
      {
        type: 'receipt_scanned' as const,
        title: 'Receipt Scanned & Processed',
        message: 'The Mountain Cafe receipt (₹1,354.50) processed with 5% GST.',
        groupName: 'Manali Trip',
        amountText: '₹1,354.50',
        actorName: 'SplitSnap AI OCR',
        actionType: 'expense' as const,
        groupId: 'grp_manali_2026',
      },
    ];

    const sim = simulations[simIndex % simulations.length];
    setSimIndex(prev => prev + 1);
    notify(sim, true);
  }, [notify, simIndex]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        unreadCount,
        isDrawerOpen,
        setIsDrawerOpen,
        notify,
        dismissToast,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        simulateIncomingActivity,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
