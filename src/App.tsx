import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HackathonDemoBar } from './components/HackathonDemoBar';
import { GroupsView } from './components/GroupsView';
import { GroupDetailView } from './components/GroupDetailView';
import { AddExpenseView } from './components/AddExpenseView';
import { CameraScanView } from './components/CameraScanView';
import { ReviewReceiptAIView } from './components/ReviewReceiptAIView';
import { ChooseItemsView } from './components/ChooseItemsView';
import { SettleUpDirectView } from './components/SettleUpDirectView';
import { FriendsView } from './components/FriendsView';
import { ActivityView } from './components/ActivityView';
import { AccountView } from './components/AccountView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SettleUpModal } from './components/SettleUpModal';
import { GuestPortal } from './components/GuestPortal';
import { ChatbotDrawer } from './components/ChatbotDrawer';
import { ReceiptSplitStudio } from './components/ReceiptSplitStudio';
import { ToastNotificationContainer } from './components/ToastNotificationContainer';
import { NotificationDrawer } from './components/NotificationDrawer';
import { NotificationProvider } from './context/NotificationContext';
import { fetchGroups, fetchGroup, resetDemo } from './utils/api';
import { Settlement, GroupMember } from './domain/types';

function AppContent() {
  // Active screen:
  // 'dashboard' | 'group_detail' | 'add_expense' | 'scan_receipt' | 'review_ai' | 'choose_items' | 'settle_up'
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');

  // Bottom navigation tab for dashboard view
  const [currentTab, setCurrentTab] = useState<'groups' | 'friends' | 'activity' | 'account'>('groups');

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>('grp_manali_2026');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupData, setSelectedGroupData] = useState<any>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Settle modal (for traditional popups)
  const [settleModalData, setSettleModalData] = useState<{
    isOpen: boolean;
    settlement: Settlement | null;
    fromMember?: GroupMember;
    toMember?: GroupMember;
  }>({
    isOpen: false,
    settlement: null,
  });

  // Guest portal link mode
  const [guestPortalToken, setGuestPortalToken] = useState<string | null>(null);
  const [guestPortalName, setGuestPortalName] = useState<string | undefined>(undefined);

  // SplitSnap AI Assistant drawer state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Scanned Receipt and Chosen Share Workflow State
  const [scannedReceipt, setScannedReceipt] = useState<any>(null);
  const [chosenShare, setChosenShare] = useState<{ amount: string; description: string } | null>(null);

  // Load groups on mount
  const loadGroups = async () => {
    try {
      const data = await fetchGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroup(selectedGroupId)
        .then(data => setSelectedGroupData(data))
        .catch(err => console.error('Error fetching group detail:', err));
    }
  }, [selectedGroupId]);

  const handleRefresh = async () => {
    await loadGroups();
    if (selectedGroupId) {
      const detail = await fetchGroup(selectedGroupId);
      setSelectedGroupData(detail);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await resetDemo();
      await loadGroups();
      if (selectedGroupId) {
        const detail = await fetchGroup(selectedGroupId);
        setSelectedGroupData(detail);
      }
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Helper dummy group data if backend is warming up
  const fallbackManaliGroup = {
    id: 'grp_manali_2026',
    name: 'Manali Trip',
    type: 'Trip' as any,
    currency: 'INR',
    ownerUserId: 'user_kushagra',
    members: [
      {
        id: 'mem_1',
        groupId: 'grp_manali_2026',
        name: 'Aryan Gupta',
        upiId: 'aryangupta@okaxis',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        role: 'member' as any,
      },
      {
        id: 'mem_2',
        groupId: 'grp_manali_2026',
        name: 'Aditya Sharma',
        upiId: 'aditya@oksbi',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        role: 'member' as any,
      },
      {
        id: 'mem_3',
        groupId: 'grp_manali_2026',
        name: 'Kushagra',
        upiId: 'kushagra@okhdfcbank',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        role: 'owner' as any,
        isCurrentUser: true,
      },
    ],
    expenses: [],
    settlements: [],
    invites: [],
    activity: [],
    createdAt: '2026-11-09T00:00:00Z',
  };

  const currentGroup = selectedGroupData?.group || fallbackManaliGroup;

  // Render the current view content in full-screen responsive layout
  const renderViewContent = () => {
    switch (activeScreen) {
      case 'dashboard':
        return currentTab === 'groups' ? (
          <GroupsView
            groups={groups}
            onSelectGroup={id => {
              setSelectedGroupId(id);
              setActiveScreen('group_detail');
            }}
            onRefresh={handleRefresh}
            onScanReceipt={() => setActiveScreen('scan_receipt')}
            onSettleUp={() => setActiveScreen('settle_up')}
            onAddExpense={() => setActiveScreen('add_expense')}
          />
        ) : currentTab === 'friends' ? (
          <FriendsView
            groups={groups}
            onOpenSettleModal={() => setActiveScreen('settle_up')}
          />
        ) : currentTab === 'activity' ? (
          <ActivityView groups={groups} />
        ) : (
          <AccountView groups={groups} />
        );

      case 'group_detail':
        return (
          <GroupDetailView
            group={currentGroup}
            balances={selectedGroupData?.balances || {}}
            simplifiedDebts={selectedGroupData?.simplifiedDebts || []}
            onBack={() => setActiveScreen('dashboard')}
            onOpenSplitStudio={() => setActiveScreen('split_studio')}
            onOpenSettleModal={(settlement, fromM, toM) => {
              setSettleModalData({
                isOpen: true,
                settlement,
                fromMember: fromM,
                toMember: toM,
              });
            }}
            onOpenGuestPortal={(token, name) => {
              setGuestPortalToken(token);
              setGuestPortalName(name);
            }}
            onRefresh={handleRefresh}
            onSettleNow={() => setActiveScreen('settle_up')}
          />
        );

      case 'split_studio':
        return (
          <ReceiptSplitStudio
            groupId={currentGroup.id}
            members={currentGroup.members}
            onComplete={async () => {
              await handleRefresh();
              setActiveScreen('group_detail');
            }}
            onCancel={() => setActiveScreen('group_detail')}
          />
        );

      case 'add_expense':
        return (
          <AddExpenseView
            group={currentGroup}
            initialAmount={chosenShare?.amount || '2,340.00'}
            initialDescription={chosenShare?.description || 'Dinner at Cafe'}
            onBack={() => setActiveScreen('group_detail')}
            onSaved={async () => {
              await handleRefresh();
              setActiveScreen('group_detail');
            }}
            onEditReceipt={() => setActiveScreen('review_ai')}
            onOpenSplitStudio={() => setActiveScreen('split_studio')}
          />
        );

      case 'scan_receipt':
        return (
          <CameraScanView
            onBack={() => setActiveScreen('group_detail')}
            onCapture={(sample) => {
              setScannedReceipt(sample);
              setActiveScreen('review_ai');
            }}
            onPickGallery={() => {
              setActiveScreen('split_studio');
            }}
          />
        );

      case 'review_ai':
        return (
          <ReviewReceiptAIView
            receipt={scannedReceipt}
            onBack={() => setActiveScreen('scan_receipt')}
            onUseReceipt={(data) => {
              setScannedReceipt(data);
              setActiveScreen('choose_items');
            }}
            onOpenSplitStudio={() => setActiveScreen('split_studio')}
          />
        );

      case 'choose_items':
        return (
          <ChooseItemsView
            receipt={scannedReceipt}
            onBack={() => setActiveScreen('review_ai')}
            onConfirm={(totalShare, _selectedItems, receiptData) => {
              setChosenShare({
                amount: totalShare.toFixed(2),
                description: `${receiptData?.merchantName || 'The Mountain Cafe'} (Your Items)`,
              });
              setActiveScreen('add_expense');
            }}
          />
        );

      case 'settle_up':
        return (
          <SettleUpDirectView
            group={currentGroup}
            simplifiedDebts={selectedGroupData?.simplifiedDebts || []}
            onBack={() => setActiveScreen('group_detail')}
            onPaymentConfirmed={async () => {
              await handleRefresh();
              setActiveScreen('dashboard');
            }}
          />
        );

      default:
        return (
          <GroupsView
            groups={groups}
            onSelectGroup={() => setActiveScreen('group_detail')}
            onRefresh={handleRefresh}
            onScanReceipt={() => setActiveScreen('scan_receipt')}
            onSettleUp={() => setActiveScreen('settle_up')}
            onAddExpense={() => setActiveScreen('add_expense')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#06090d] text-slate-100 flex flex-col font-sans selection:bg-emerald-400/30 relative overflow-x-hidden">
      {/* Top Demo Utility Bar */}
      <HackathonDemoBar
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
        activeScreen={activeScreen}
        onSelectScreen={screen => setActiveScreen(screen)}
        onOpenGuestPortal={(token, name) => {
          setGuestPortalToken(token);
          setGuestPortalName(name);
        }}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* Main Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={tab => {
          setCurrentTab(tab);
          setActiveScreen('dashboard');
        }}
        onNewExpense={() => setActiveScreen('add_expense')}
        onScanReceipt={() => setActiveScreen('scan_receipt')}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* Full-Width Main Content Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {guestPortalToken ? (
          <div className="w-full max-w-4xl mx-auto">
            <GuestPortal
              token={guestPortalToken}
              guestNameOverride={guestPortalName}
              onExit={() => setGuestPortalToken(null)}
            />
          </div>
        ) : (
          renderViewContent()
        )}
      </main>

      {/* Mobile Bottom Navigation (only visible on mobile/tablet viewports) */}
      <div className="md:hidden">
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={tab => {
            setCurrentTab(tab);
            setActiveScreen('dashboard');
          }}
        />
      </div>

      {/* Settle Up Modal */}
      <SettleUpModal
        isOpen={settleModalData.isOpen}
        onClose={() => setSettleModalData({ isOpen: false, settlement: null })}
        settlement={settleModalData.settlement}
        fromMember={settleModalData.fromMember}
        toMember={settleModalData.toMember}
        onSettlementUpdated={handleRefresh}
      />

      {/* SplitSnap AI Chatbot Assistant Drawer / Floating Action Button */}
      <ChatbotDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(!isChatOpen)}
        onNavigateToSettle={() => setActiveScreen('settle_up')}
        onNavigateToReceipt={() => setActiveScreen('review_ai')}
        onNavigateToAddExpense={() => setActiveScreen('add_expense')}
      />

      {/* Global Toast Notification Overlay */}
      <ToastNotificationContainer />

      {/* Slide-Over Notification Center / Alert Drawer */}
      <NotificationDrawer
        onSelectGroup={groupId => {
          setSelectedGroupId(groupId);
          setActiveScreen('group_detail');
        }}
        onNavigateToSettle={() => setActiveScreen('settle_up')}
        onNavigateToExpense={() => setActiveScreen('add_expense')}
      />
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}
