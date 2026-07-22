import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function GroupView() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);

  // Modals / Forms state
  const [memberEmail, setMemberEmail] = useState('');
  const [memberMsg, setMemberMsg] = useState('');

  // Expense Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payerId, setPayerId] = useState('');
  const [splitType, setSplitType] = useState('EQUAL'); // EQUAL, EXACT, PERCENT
  const [participantShares, setParticipantShares] = useState({});

  // LEDGER FILTER STATE
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // SETTLE UP STATE
  const [settlingItem, setSettlingItem] = useState(null);
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
    fetchExpenses();
    fetchBalancesAndSettlements();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const res = await api.get(`/groups/${groupId}`);
      setGroup(res.data);
      if (res.data.members && res.data.members.length > 0) {
        setPayerId(res.data.members[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await api.get(`/expenses/${groupId}/expenses`);
      setExpenses(res.data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    }
  };

  const fetchBalancesAndSettlements = async () => {
    try {
      const [balRes, setRes] = await Promise.all([
        api.get(`/expenses/${groupId}/balances`),
        api.get(`/expenses/${groupId}/settlements`)
      ]);
      setBalances(balRes.data);
      setSettlements(setRes.data);
    } catch (err) {
      console.error('Failed to fetch balances/settlements:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberMsg('');
    try {
      await api.post(`/groups/${groupId}/members`, { email: memberEmail });
      setMemberEmail('');
      setMemberMsg('Member added successfully!');
      fetchGroupDetails();
    } catch (err) {
      setMemberMsg(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!amount || !payerId) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    let totalSharesEntered = 0;
    const participants = group.members.map((m) => {
      const shareVal = parseFloat(participantShares[m.id] || 0);
      totalSharesEntered += shareVal;

      const p = { userId: m.id };
      if (splitType === 'EXACT') p.amount = shareVal;
      if (splitType === 'PERCENT') p.percent = shareVal;
      return p;
    });

    if (splitType === 'EXACT') {
      if (Math.abs(totalSharesEntered - parsedAmount) > 0.01) {
        alert(`The total specified exact amounts (₹${totalSharesEntered.toFixed(2)}) must equal the expense amount (₹${parsedAmount.toFixed(2)}).`);
        return;
      }
    } else if (splitType === 'PERCENT') {
      if (Math.abs(totalSharesEntered - 100) > 0.01) {
        alert(`The total percentage entered (${totalSharesEntered}%) must equal 100%.`);
        return;
      }
    }

    try {
      await api.post(`/expenses/${groupId}/expenses`, {
        amount: parsedAmount,
        description,
        payerId: isNaN(Number(payerId)) ? payerId : parseInt(payerId, 10),
        splitType,
        participants
      });

      setAmount('');
      setDescription('');
      setParticipantShares({});

      fetchExpenses();
      fetchBalancesAndSettlements();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add expense');
    }
  };

  const handleConfirmSettle = async () => {
    if (!settlingItem) return;
    setIsSubmittingSettle(true);

    let rawPayerId = settlingItem.payerId || settlingItem.fromId || settlingItem.fromUserId;
    let rawReceiverId = settlingItem.receiverId || settlingItem.toId || settlingItem.toUserId;

    if (!rawPayerId && group?.members) {
      const payerName = (settlingItem.from || settlingItem.payerName)?.toLowerCase();
      const foundPayer = group.members.find(
        (m) => m.name?.toLowerCase() === payerName || m.email?.toLowerCase() === payerName
      );
      if (foundPayer) rawPayerId = foundPayer.id;
    }

    if (!rawReceiverId && group?.members) {
      const receiverName = (settlingItem.to || settlingItem.receiverName)?.toLowerCase();
      const foundReceiver = group.members.find(
        (m) => m.name?.toLowerCase() === receiverName || m.email?.toLowerCase() === receiverName
      );
      if (foundReceiver) rawReceiverId = foundReceiver.id;
    }

    if (!rawPayerId || !rawReceiverId || !settlingItem.amount) {
      alert('Could not resolve valid payer, receiver, or amount.');
      setIsSubmittingSettle(false);
      return;
    }

    try {
      await api.post(`/expenses/${groupId}/settle`, {
        payerId: isNaN(Number(rawPayerId)) ? rawPayerId : parseInt(rawPayerId, 10),
        receiverId: isNaN(Number(rawReceiverId)) ? rawReceiverId : parseInt(rawReceiverId, 10),
        amount: parseFloat(settlingItem.amount)
      });

      setSettlingItem(null);
      fetchExpenses();
      fetchBalancesAndSettlements();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to settle debt.');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  // --- CHRONOLOGICAL LEDGER & FILTERING LOGIC ---
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // 1. Filter by User (Payer or Participant)
        if (filterUser !== 'ALL') {
          const selectedUserIdStr = String(filterUser);
          const isPayer = String(exp.payer_id || exp.payerId) === selectedUserIdStr;
          const isParticipant = exp.participants?.some(
            (p) => String(p.user_id || p.userId) === selectedUserIdStr
          );
          if (!isPayer && !isParticipant) return false;
        }

        // 2. Filter by Date Range
        const expDate = exp.created_at || exp.createdAt ? new Date(exp.created_at || exp.createdAt) : null;
        if (expDate) {
          if (filterStartDate) {
            const start = new Date(filterStartDate);
            start.setHours(0, 0, 0, 0);
            if (expDate < start) return false;
          }
          if (filterEndDate) {
            const end = new Date(filterEndDate);
            end.setHours(23, 59, 59, 999);
            if (expDate > end) return false;
          }
        }

        return true;
      })
      // Chronological Sorting: Latest entries first
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0);
        const dateB = new Date(b.created_at || b.createdAt || 0);
        return dateB - dateA;
      });
  }, [expenses, filterUser, filterStartDate, filterEndDate]);

  if (!group) {
    return (
      <div style={pageContainerStyle}>
        <div style={{ color: '#94a3b8', padding: '60px 0', textAlign: 'center' }}>
          Loading ledger details...
        </div>
      </div>
    );
  }

  return (
    <div style={pageContainerStyle}>
      <div style={topGlowStyle} />

      <main style={mainContentStyle}>
        {/* TOP BREADCRUMB */}
        <button
          onClick={() => navigate('/dashboard')}
          style={backButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#a78bfa')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          ← Back to Dashboard
        </button>

        {/* HERO HEADER */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={groupHeaderIconStyle}>
              {group.name?.charAt(0).toUpperCase() || 'G'}
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: '800', color: '#ffffff' }}>
                {group.name}
              </h1>
              <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                {group.description || 'Shared Expense Ledger'} • {group.members?.length || 0} Members
              </p>
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px' }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ADD EXPENSE CARD */}
            <div style={glassCardStyle}>
              <h3 style={cardTitleStyle}>
                <span style={{ color: '#7c3aed' }}>+</span> Record New Expense
              </h3>

              <form onSubmit={handleAddExpense}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelStyle}>Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Dinner, Taxi, Hotel"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>Paid By</label>
                    <select value={payerId} onChange={(e) => setPayerId(e.target.value)} style={selectStyle}>
                      {group.members.map((m) => (
                        <option key={m.id} value={m.id} style={{ backgroundColor: '#0f172a' }}>
                          {m.name || m.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Split Type</label>
                    <select value={splitType} onChange={(e) => setSplitType(e.target.value)} style={selectStyle}>
                      <option value="EQUAL" style={{ backgroundColor: '#0f172a' }}>Split Equally</option>
                      <option value="EXACT" style={{ backgroundColor: '#0f172a' }}>Exact Amounts</option>
                      <option value="PERCENT" style={{ backgroundColor: '#0f172a' }}>By Percentage</option>
                    </select>
                  </div>
                </div>

                {splitType !== 'EQUAL' && (
                  <div style={splitBreakdownBoxStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, fontWeight: '600' }}>
                        Enter {splitType === 'EXACT' ? 'Amount (₹)' : 'Percentage (%)'} per member:
                      </p>
                    </div>

                    {group.members.map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.88rem', color: '#e2e8f0' }}>{m.name || m.email}</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={splitType === 'EXACT' ? '0.00' : '0%'}
                          value={participantShares[m.id] || ''}
                          onChange={(e) => setParticipantShares({ ...participantShares, [m.id]: e.target.value })}
                          style={{ ...inputStyle, width: '110px', textAlign: 'right' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" style={primaryGradientBtnStyle}>
                  Record Expense
                </button>
              </form>
            </div>

            {/* CHRONOLOGICAL GROUP LEDGER WITH FILTERS */}
            <div style={glassCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ ...cardTitleStyle, margin: 0 }}>Chronological Ledger</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                  Showing {filteredExpenses.length} entries
                </span>
              </div>

              {/* FILTER CONTROLS BAR */}
              <div style={filterBarContainerStyle}>
                <div>
                  <label style={filterLabelStyle}>Filter User</label>
                  <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    style={filterInputStyle}
                  >
                    <option value="ALL" style={{ backgroundColor: '#0f172a' }}>All Members</option>
                    {group.members.map((m) => (
                      <option key={m.id} value={m.id} style={{ backgroundColor: '#0f172a' }}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={filterLabelStyle}>From Date</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    style={filterInputStyle}
                  />
                </div>

                <div>
                  <label style={filterLabelStyle}>To Date</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    style={filterInputStyle}
                  />
                </div>

                {(filterUser !== 'ALL' || filterStartDate || filterEndDate) && (
                  <button
                    onClick={() => {
                      setFilterUser('ALL');
                      setFilterStartDate('');
                      setFilterEndDate('');
                    }}
                    style={clearFilterBtnStyle}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* LEDGER ENTRIES LIST */}
              {filteredExpenses.length === 0 ? (
                <div style={{ color: '#64748b', padding: '28px 0', textAlign: 'center', fontSize: '0.9rem' }}>
                  No transaction records match the current filters.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredExpenses.map((exp) => {
                    const createdDate = exp.created_at || exp.createdAt;
                    const dateFormatted = createdDate
                      ? new Date(createdDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Recently';

                    return (
                      <div key={exp.id} style={expenseRowStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={expenseIconStyle}>
                            {exp.split_type === 'SETTLEMENT' ? '💸' : '🧾'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#f8fafc', fontSize: '0.98rem' }}>
                              {exp.description || 'General Expense'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                              {exp.split_type === 'SETTLEMENT' ? (
                                <span style={{ color: '#34d399', fontWeight: '600' }}>Payment Settled</span>
                              ) : (
                                <>
                                  Paid by <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{exp.payerName || 'Member'}</span>
                                  <span style={splitBadgeStyle}>{exp.split_type}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={expenseAmountStyle}>
                            ₹{Number(exp.amount).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                            {dateFormatted}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ADD MEMBER CARD */}
            <div style={glassCardStyle}>
              <h4 style={sideCardTitleStyle}>Add Member</h4>
              <form onSubmit={handleAddMember}>
                <input
                  type="email"
                  placeholder="user@example.com"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '12px' }}
                />
                <button type="submit" style={secondaryBtnStyle}>
                  + Add User
                </button>
              </form>
              {memberMsg && (
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: memberMsg.includes('success') ? '#10b981' : '#ff5252' }}>
                  {memberMsg}
                </div>
              )}
            </div>

            {/* NET BALANCES CARD */}
            <div style={glassCardStyle}>
              <h4 style={sideCardTitleStyle}>Net Balances</h4>
              {balances.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>No balances recorded.</div>
              ) : (
                balances.map((b) => (
                  <div key={b.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.88rem', color: '#cbd5e1', fontWeight: '500' }}>{b.name}</span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        color: b.balance > 0 ? '#10b981' : b.balance < 0 ? '#ff5252' : '#64748b'
                      }}
                    >
                      {b.balance > 0 ? `+₹${b.balance.toFixed(2)}` : b.balance < 0 ? `-₹${Math.abs(b.balance).toFixed(2)}` : 'Settled'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* OPTIMIZED SETTLEMENT PLAN */}
            <div style={settlementCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚡</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#a78bfa', letterSpacing: '0.5px' }}>
                  OPTIMIZED SETTLEMENT
                </h4>
              </div>

              {settlements.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#34d399', fontWeight: '600' }}>
                  🎉 Everyone is fully settled! No pending transfers needed.
                </p>
              ) : (
                settlements.map((s, idx) => {
                  const payerName = s.from || s.payerName || s.fromName;
                  const receiverName = s.to || s.receiverName || s.toName;

                  return (
                    <div key={idx} style={settlementRowStyle}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
                          <strong style={{ color: '#ffffff' }}>{payerName}</strong> pays <strong style={{ color: '#ffffff' }}>{receiverName}</strong>
                        </div>
                        <div style={settlementAmountStyle}>
                          ₹{Number(s.amount).toFixed(2)}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSettlingItem({ ...s, payerName, receiverName });
                        }}
                        style={settleUpButtonStyle}
                      >
                        Settle Up
                      </button>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>
      </main>

      {/* SETTLE UP CONFIRMATION MODAL */}
      {settlingItem && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <h3 style={{ margin: '0 0 12px 0', color: '#ffffff', fontSize: '1.2rem', fontWeight: '700' }}>
              Confirm Settlement
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              Record a settlement payment of <strong style={{ color: '#34d399' }}>₹{Number(settlingItem.amount).toFixed(2)}</strong> from <strong>{settlingItem.payerName}</strong> to <strong>{settlingItem.receiverName}</strong>?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setSettlingItem(null)}
                style={modalCancelBtnStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSettle}
                disabled={isSubmittingSettle}
                style={modalConfirmBtnStyle}
              >
                {isSubmittingSettle ? 'Settling...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- DESIGN SYSTEM & STYLES ---

const pageContainerStyle = {
  minHeight: '100vh',
  backgroundColor: '#090a0f',
  color: '#f8fafc',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  position: 'relative',
  overflowX: 'hidden',
};

const topGlowStyle = {
  position: 'absolute',
  top: '-150px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '600px',
  height: '350px',
  background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none',
};

const mainContentStyle = {
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '40px 24px',
  position: 'relative',
  zIndex: 1,
};

const backButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: '0.88rem',
  fontWeight: '600',
  marginBottom: '20px',
  padding: 0,
  transition: 'color 0.2s',
};

const groupHeaderIconStyle = {
  width: '48px',
  height: '48px',
  borderRadius: '14px',
  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontSize: '1.4rem',
  boxShadow: '0 4px 20px rgba(124, 58, 237, 0.3)',
};

const glassCardStyle = {
  backgroundColor: 'rgba(18, 22, 34, 0.65)',
  backdropFilter: 'blur(12px)',
  padding: '24px',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
};

const cardTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 18px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const sideCardTitleStyle = {
  fontSize: '0.92rem',
  fontWeight: '700',
  color: '#f8fafc',
  margin: '0 0 14px 0',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: '600',
  color: '#94a3b8',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  outline: 'none',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
};

const splitBreakdownBoxStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.25)',
  padding: '14px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  marginBottom: '16px',
};

const primaryGradientBtnStyle = {
  width: '100%',
  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
  color: '#ffffff',
  padding: '12px',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.9rem',
  cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
};

const secondaryBtnStyle = {
  width: '100%',
  backgroundColor: 'rgba(124, 58, 237, 0.15)',
  border: '1px solid rgba(124, 58, 237, 0.3)',
  color: '#a78bfa',
  padding: '10px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.88rem',
  cursor: 'pointer',
};

const expenseRowStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  padding: '14px 18px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const expenseIconStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
};

const splitBadgeStyle = {
  marginLeft: '8px',
  fontSize: '0.65rem',
  fontWeight: '800',
  color: '#a78bfa',
  backgroundColor: 'rgba(124, 58, 237, 0.15)',
  padding: '2px 6px',
  borderRadius: '4px',
  textTransform: 'uppercase',
};

const expenseAmountStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: '700',
  fontSize: '1.1rem',
  color: '#10b981',
};

const filterBarContainerStyle = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr 1fr auto',
  gap: '10px',
  alignItems: 'flex-end',
  backgroundColor: 'rgba(0, 0, 0, 0.25)',
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  marginBottom: '16px',
};

const filterLabelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase',
  marginBottom: '4px',
};

const filterInputStyle = {
  width: '100%',
  padding: '6px 10px',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '6px',
  color: '#f1f5f9',
  fontSize: '0.8rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const clearFilterBtnStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#f87171',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '0.8rem',
  fontWeight: '600',
  cursor: 'pointer',
  height: '32px',
};

const settlementCardStyle = {
  backgroundColor: 'rgba(124, 58, 237, 0.05)',
  backdropFilter: 'blur(12px)',
  padding: '20px',
  borderRadius: '16px',
  border: '1px solid rgba(124, 58, 237, 0.3)',
  boxShadow: '0 0 25px rgba(124, 58, 237, 0.15)',
};

const settlementRowStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  marginBottom: '8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const settlementAmountStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: '700',
  fontSize: '0.95rem',
  color: '#10b981',
  marginTop: '4px',
};

const settleUpButtonStyle = {
  backgroundColor: '#6d28d9',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '6px 14px',
  fontWeight: '600',
  fontSize: '0.8rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)',
};

const modalCardStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  padding: '28px',
  maxWidth: '400px',
  width: '90%',
  boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
};

const modalCancelBtnStyle = {
  backgroundColor: 'transparent',
  border: '1px solid #475569',
  color: '#cbd5e1',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
};

const modalConfirmBtnStyle = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  padding: '8px 18px',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
};