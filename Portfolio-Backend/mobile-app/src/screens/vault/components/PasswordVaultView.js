import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../../utils/tw';
import { vaultApi, getVaultSessionToken, setVaultSessionToken } from '../../../services/vault/vaultApi';

/* ─── constants ─── */
const SESSION_DURATION_SEC = 15 * 60; // 15 minutes

/* ═══════════════════════════════════════════════════════════
   Helper: Clipboard (platform-aware)
   ═══════════════════════════════════════════════════════════ */
async function copyToClipboard(text) {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Native – try Clipboard API; fall back to alert
    try {
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      Clipboard.setString(text);
      return true;
    } catch {
      Alert.alert('Copied', text);
      return true;
    }
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   Helper: formatted timer MM:SS
   ═══════════════════════════════════════════════════════════ */
function formatCountdown(secs) {
  if (secs <= 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ═══════════════════════════════════════════════════════════
   Helper: formatted date
   ═══════════════════════════════════════════════════════════ */
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ═══════════════════════════════════════════════════════════
   Reusable tiny components
   ═══════════════════════════════════════════════════════════ */

function FieldLabel({ children }) {
  return (
    <Text style={tw`text-txt-secondary text-xs font-semibold mb-1.5 ml-1`}>
      {children}
    </Text>
  );
}

function InputRow({ icon, children }) {
  return (
    <View
      style={tw`flex-row items-center bg-vault-surface border border-vault-border-light rounded-xl px-3`}
    >
      {icon && (
        <Ionicons name={icon} size={18} color={tw.color('txt-dim')} style={tw`mr-2`} />
      )}
      {children}
    </View>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <View style={tw`flex-row items-start bg-accent-danger/10 rounded-lg px-3 py-2.5 mb-4`}>
      <Ionicons
        name="alert-circle"
        size={16}
        color={tw.color('accent-danger')}
        style={tw`mr-2 mt-0.5`}
      />
      <Text style={tw`text-accent-danger text-sm flex-1`}>{message}</Text>
    </View>
  );
}

function PrimaryButton({ onPress, loading, disabled, icon, label, loadingLabel, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={[
        tw`bg-accent-primary rounded-xl py-3.5 items-center justify-center flex-row`,
        (loading || disabled) && tw`opacity-60`,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" style={tw`mr-2`} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color="#fff" style={tw`mr-2`} />
      ) : null}
      <Text style={tw`text-white text-sm font-bold`}>{loading ? loadingLabel : label}</Text>
    </TouchableOpacity>
  );
}

function DangerButton({ onPress, loading, icon, label, loadingLabel, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[
        tw`bg-accent-danger rounded-xl py-3 items-center justify-center flex-row`,
        loading && tw`opacity-60`,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" style={tw`mr-2`} />
      ) : icon ? (
        <Ionicons name={icon} size={16} color="#fff" style={tw`mr-2`} />
      ) : null}
      <Text style={tw`text-white text-sm font-bold`}>{loading ? loadingLabel : label}</Text>
    </TouchableOpacity>
  );
}

function ModalShell({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={tw`flex-1 bg-black/60 justify-end`}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw`max-h-[90%]`}
        >
          <View style={tw`bg-vault-card rounded-t-3xl border-t border-vault-border`}>
            {/* Header */}
            <View style={tw`flex-row items-center justify-between px-5 pt-5 pb-3`}>
              <Text style={tw`text-txt-primary text-lg font-bold flex-1`}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close-circle" size={26} color={tw.color('txt-dim')} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={tw`px-5 pb-8`}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ToastBanner({ message }) {
  if (!message) return null;
  return (
    <View
      style={tw`absolute top-12 left-5 right-5 z-50 bg-accent-success/90 rounded-xl px-4 py-3`}
    >
      <Text style={tw`text-white text-sm font-semibold text-center`}>{message}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function PasswordVaultView({ onBack }) {
  /* ── vault status ── */
  const [vaultConfigured, setVaultConfigured] = useState(null); // null = loading
  const [sessionToken, setSessionToken] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  /* ── countdown timer ── */
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);
  const sessionStartRef = useRef(null);

  /* ── modals ── */
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  /* ── password visibility per entry ── */
  const [visiblePasswords, setVisiblePasswords] = useState({});
  /* ── notes expansion per entry ── */
  const [expandedNotes, setExpandedNotes] = useState({});

  /* ─── toast helper ─── */
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }, []);

  /* ─── countdown helpers ─── */
  const startCountdown = useCallback(() => {
    sessionStartRef.current = Date.now();
    setCountdown(SESSION_DURATION_SEC);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const remaining = SESSION_DURATION_SEC - elapsed;
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        // Auto-lock
        handleLock();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  /* ─── initial load ─── */
  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setLoading(true);
    try {
      const res = await vaultApi.getPasswordVaultStatus();
      if (res.ok) {
        setVaultConfigured(!!res.data.isConfigured);
        // Check for existing session token
        const existingToken = getVaultSessionToken();
        if (existingToken && res.data.isConfigured) {
          setSessionToken(existingToken);
          startCountdown();
          loadEntries(existingToken);
        }
      } else {
        setVaultConfigured(false);
      }
    } catch {
      setVaultConfigured(false);
    } finally {
      setLoading(false);
    }
  }

  /* ─── load entries ─── */
  async function loadEntries(token) {
    const tkn = token || sessionToken;
    if (!tkn) return;
    try {
      const res = await vaultApi.getPasswordVaultEntries(tkn);
      if (res.ok) {
        setEntries(res.data.entries || res.data || []);
      } else if (res.status === 401) {
        // Session expired
        handleLock();
        showToast('Session expired. Please unlock again.');
      }
    } catch {
      showToast('Failed to load entries.');
    }
  }

  /* ─── lock ─── */
  function handleLock() {
    setSessionToken(null);
    setVaultSessionToken(null);
    setEntries([]);
    setVisiblePasswords({});
    setExpandedNotes({});
    stopCountdown();
  }

  /* ─── delete entry ─── */
  function handleDeleteEntry(entry) {
    const doDelete = async () => {
      try {
        const res = await vaultApi.deletePasswordVaultEntry(entry._id || entry.id, sessionToken);
        if (res.ok) {
          showToast('Entry deleted.');
          loadEntries();
        } else {
          showToast(res.data?.error || 'Delete failed.');
        }
      } catch {
        showToast('Delete failed.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this password entry? This cannot be undone.')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Entry', 'Delete this password entry? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  /* ─── toggle helpers ─── */
  function togglePasswordVisibility(id) {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleNotes(id) {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  /* ── header ── */
  const renderHeader = () => (
    <View style={tw`flex-row items-center px-4 pt-4 pb-3 bg-vault-card border-b border-vault-border`}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={tw`mr-3`}>
        <Ionicons name="arrow-back" size={24} color={tw.color('txt-primary')} />
      </TouchableOpacity>
      <Ionicons name="key" size={20} color={tw.color('accent-primary')} style={tw`mr-2`} />
      <Text style={tw`text-txt-primary text-lg font-bold flex-1`}>Password Vault</Text>

      {/* Status indicator */}
      {sessionToken ? (
        <View style={tw`flex-row items-center`}>
          <View style={tw`w-2 h-2 rounded-full bg-accent-success mr-2`} />
          <Text style={tw`text-accent-success text-xs font-semibold mr-3`}>Unlocked</Text>
          <Text style={tw`text-accent-warning text-xs font-mono font-bold`}>
            {formatCountdown(countdown)}
          </Text>
        </View>
      ) : vaultConfigured ? (
        <View style={tw`flex-row items-center`}>
          <View style={tw`w-2 h-2 rounded-full bg-accent-danger mr-2`} />
          <Text style={tw`text-accent-danger text-xs font-semibold`}>Locked</Text>
        </View>
      ) : null}
    </View>
  );

  /* ── loading state ── */
  if (loading) {
    return (
      <View style={tw`flex-1 bg-vault-bg`}>
        {renderHeader()}
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={tw.color('accent-primary')} />
          <Text style={tw`text-txt-muted text-sm mt-4`}>Checking vault status…</Text>
        </View>
      </View>
    );
  }

  /* ── not configured ── */
  if (!vaultConfigured) {
    return (
      <View style={tw`flex-1 bg-vault-bg`}>
        {renderHeader()}
        <ToastBanner message={toast} />
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <View style={tw`w-20 h-20 rounded-full bg-accent-primary/15 items-center justify-center mb-5`}>
            <Ionicons name="shield-checkmark-outline" size={40} color={tw.color('accent-primary')} />
          </View>
          <Text style={tw`text-txt-primary text-xl font-bold mb-2 text-center`}>
            Setup Password Vault
          </Text>
          <Text style={tw`text-txt-muted text-sm text-center mb-8 max-w-xs`}>
            Protect your passwords with a master password and two-factor authentication (TOTP).
          </Text>
          <PrimaryButton
            icon="shield-checkmark-outline"
            label="Setup Vault"
            onPress={() => setSetupModalVisible(true)}
            style={{ width: 220 }}
          />
        </View>
        <SetupModal
          visible={setupModalVisible}
          onClose={() => setSetupModalVisible(false)}
          onSuccess={(token) => {
            setSetupModalVisible(false);
            setVaultConfigured(true);
            setSessionToken(token);
            setVaultSessionToken(token);
            startCountdown();
            showToast('Vault setup complete!');
            loadEntries(token);
          }}
        />
      </View>
    );
  }

  /* ── configured but locked ── */
  if (!sessionToken) {
    return (
      <View style={tw`flex-1 bg-vault-bg`}>
        {renderHeader()}
        <ToastBanner message={toast} />
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <View style={tw`w-20 h-20 rounded-full bg-accent-warning/15 items-center justify-center mb-5`}>
            <Ionicons name="lock-closed" size={40} color={tw.color('accent-warning')} />
          </View>
          <Text style={tw`text-txt-primary text-xl font-bold mb-2 text-center`}>
            Vault is Locked
          </Text>
          <Text style={tw`text-txt-muted text-sm text-center mb-8 max-w-xs`}>
            Enter your master password and TOTP code to access your passwords.
          </Text>
          <PrimaryButton
            icon="lock-open-outline"
            label="Unlock Vault"
            onPress={() => setUnlockModalVisible(true)}
            style={{ width: 220 }}
          />
        </View>
        <UnlockModal
          visible={unlockModalVisible}
          onClose={() => setUnlockModalVisible(false)}
          onSuccess={(token) => {
            setUnlockModalVisible(false);
            setSessionToken(token);
            setVaultSessionToken(token);
            startCountdown();
            showToast('Vault unlocked!');
            loadEntries(token);
          }}
        />
      </View>
    );
  }

  /* ── unlocked – show entries ── */
  return (
    <View style={tw`flex-1 bg-vault-bg`}>
      {renderHeader()}
      <ToastBanner message={toast} />

      {/* Action bar */}
      <View style={tw`flex-row items-center px-4 py-3 gap-3`}>
        <TouchableOpacity
          onPress={() => setAddModalVisible(true)}
          style={tw`flex-row items-center bg-accent-primary rounded-xl px-4 py-2.5 flex-1 justify-center`}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" style={tw`mr-2`} />
          <Text style={tw`text-white text-sm font-bold`}>Add Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => loadEntries()}
          style={tw`bg-vault-surface border border-vault-border-light rounded-xl p-2.5`}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={20} color={tw.color('txt-secondary')} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLock}
          style={tw`bg-accent-danger/15 border border-accent-danger/30 rounded-xl px-4 py-2.5`}
          activeOpacity={0.7}
        >
          <Ionicons name="lock-closed" size={18} color={tw.color('accent-danger')} />
        </TouchableOpacity>
      </View>

      {/* Entries list */}
      <ScrollView
        contentContainerStyle={tw`px-4 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={tw`items-center py-16`}>
            <Ionicons name="file-tray-outline" size={48} color={tw.color('txt-dim')} />
            <Text style={tw`text-txt-muted text-sm mt-4`}>No password entries yet.</Text>
          </View>
        ) : (
          entries.map((entry) => {
            const entryId = entry._id || entry.id;
            const isVisible = visiblePasswords[entryId];
            const isNotesExpanded = expandedNotes[entryId];

            return (
              <View
                key={entryId}
                style={tw`bg-vault-card border border-vault-border rounded-2xl p-4 mb-3`}
              >
                {/* Folder name */}
                <View style={tw`flex-row items-center mb-3`}>
                  <Ionicons
                    name="folder"
                    size={16}
                    color={tw.color('accent-primary')}
                    style={tw`mr-2`}
                  />
                  <Text style={tw`text-txt-primary text-base font-bold flex-1`} numberOfLines={1}>
                    {entry.folderName || entry.folder?.name || 'Unknown Folder'}
                  </Text>
                </View>

                {/* Password row */}
                <View style={tw`flex-row items-center bg-vault-surface rounded-xl px-3 py-2.5 mb-3`}>
                  <Ionicons
                    name="key-outline"
                    size={16}
                    color={tw.color('txt-dim')}
                    style={tw`mr-2`}
                  />
                  <Text
                    style={tw`flex-1 text-txt-primary text-sm font-mono`}
                    numberOfLines={1}
                    selectable={isVisible}
                  >
                    {isVisible ? entry.password : '••••••••••••'}
                  </Text>

                  {/* Eye toggle */}
                  <TouchableOpacity
                    onPress={() => togglePasswordVisibility(entryId)}
                    hitSlop={8}
                    style={tw`mx-2`}
                  >
                    <Ionicons
                      name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={tw.color('txt-muted')}
                    />
                  </TouchableOpacity>

                  {/* Copy button */}
                  <TouchableOpacity
                    onPress={async () => {
                      const ok = await copyToClipboard(entry.password);
                      if (ok) showToast('Password copied!');
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="copy-outline" size={18} color={tw.color('accent-info')} />
                  </TouchableOpacity>
                </View>

                {/* Notes (collapsible) */}
                {entry.notes ? (
                  <View style={tw`mb-3`}>
                    <TouchableOpacity
                      onPress={() => toggleNotes(entryId)}
                      style={tw`flex-row items-center mb-1`}
                    >
                      <Ionicons
                        name={isNotesExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={14}
                        color={tw.color('txt-muted')}
                        style={tw`mr-1`}
                      />
                      <Text style={tw`text-txt-muted text-xs font-semibold`}>Notes</Text>
                    </TouchableOpacity>
                    {isNotesExpanded && (
                      <Text style={tw`text-txt-secondary text-sm ml-4`}>{entry.notes}</Text>
                    )}
                  </View>
                ) : null}

                {/* Dates */}
                <View style={tw`flex-row flex-wrap mb-3`}>
                  <Text style={tw`text-txt-dim text-xs mr-4`}>
                    Created: {fmtDate(entry.createdAt)}
                  </Text>
                  <Text style={tw`text-txt-dim text-xs`}>
                    Updated: {fmtDate(entry.updatedAt)}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={tw`flex-row gap-2`}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingEntry(entry);
                      setEditModalVisible(true);
                    }}
                    style={tw`flex-row items-center bg-accent-info/15 rounded-lg px-3 py-2 flex-1 justify-center`}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color={tw.color('accent-info')} style={tw`mr-1`} />
                    <Text style={tw`text-accent-info text-xs font-semibold`}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteEntry(entry)}
                    style={tw`flex-row items-center bg-accent-danger/15 rounded-lg px-3 py-2 flex-1 justify-center`}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={tw.color('accent-danger')} style={tw`mr-1`} />
                    <Text style={tw`text-accent-danger text-xs font-semibold`}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Modals ── */}
      <AddEntryModal
        visible={addModalVisible}
        sessionToken={sessionToken}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => {
          setAddModalVisible(false);
          showToast('Entry created!');
          loadEntries();
        }}
      />
      <EditEntryModal
        visible={editModalVisible}
        entry={editingEntry}
        sessionToken={sessionToken}
        onClose={() => {
          setEditModalVisible(false);
          setEditingEntry(null);
        }}
        onSuccess={() => {
          setEditModalVisible(false);
          setEditingEntry(null);
          showToast('Entry updated!');
          loadEntries();
        }}
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETUP MODAL  (inline)
   ═══════════════════════════════════════════════════════════ */
function SetupModal({ visible, onClose, onSuccess }) {
  const [step, setStep] = useState('password'); // 'password' | 'verify'
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [code, setCode] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [base32Secret, setBase32Secret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setStep('password');
      setPassword('');
      setShowPwd(false);
      setCode('');
      setQrCodeDataUrl('');
      setBase32Secret('');
      setError('');
      setLoading(false);
    }
  }, [visible]);

  async function handleSetup() {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await vaultApi.setupPasswordVault(password);
      if (res.ok) {
        setQrCodeDataUrl(res.data.qrCodeDataUrl || '');
        setBase32Secret(res.data.base32Secret || res.data.secret || '');
        setStep('verify');
      } else {
        setError(res.data?.error || res.data?.message || 'Setup failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError('');
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit TOTP code.');
      return;
    }
    setLoading(true);
    try {
      const res = await vaultApi.verifyPasswordVaultSetup(code);
      if (res.ok) {
        const token = res.data.sessionToken || res.data.token;
        if (token) onSuccess(token);
        else setError('Setup verified but no session token received.');
      } else {
        setError(res.data?.error || res.data?.message || 'Verification failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Setup Password Vault">
      {step === 'password' && (
        <>
          <FieldLabel>MASTER VAULT PASSWORD</FieldLabel>
          <View style={tw`mb-4`}>
            <InputRow icon="lock-closed-outline">
              <TextInput
                style={tw`flex-1 text-txt-primary text-sm py-3`}
                placeholder="Min 8 characters"
                placeholderTextColor={tw.color('txt-dim')}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPwd((p) => !p)}>
                <Ionicons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={tw.color('txt-dim')}
                />
              </TouchableOpacity>
            </InputRow>
          </View>
          <Text style={tw`text-txt-dim text-xs mb-4`}>
            Choose a strong master password. You'll need it every time you unlock the vault.
          </Text>
          <ErrorBox message={error} />
          <PrimaryButton
            icon="shield-checkmark-outline"
            label="Setup"
            loadingLabel="Setting up…"
            loading={loading}
            onPress={handleSetup}
          />
        </>
      )}

      {step === 'verify' && (
        <>
          {/* QR Code */}
          {qrCodeDataUrl ? (
            <View style={tw`items-center mb-4`}>
              <Text style={tw`text-txt-secondary text-sm mb-3 text-center`}>
                Scan this QR code with your authenticator app:
              </Text>
              <View style={tw`bg-white rounded-2xl p-3`}>
                <Image
                  source={{ uri: qrCodeDataUrl }}
                  style={{ width: 200, height: 200 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          ) : null}

          {/* Base32 secret */}
          {base32Secret ? (
            <View style={tw`mb-4`}>
              <Text style={tw`text-txt-muted text-xs mb-1 text-center`}>
                Or enter this code manually:
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  const ok = await copyToClipboard(base32Secret);
                  if (ok) setError(''); // Clear any error on copy
                }}
                style={tw`bg-vault-surface border border-vault-border-light rounded-xl px-4 py-3 flex-row items-center justify-center`}
              >
                <Text
                  style={tw`text-accent-primary text-sm font-mono font-bold mr-2`}
                  selectable
                >
                  {base32Secret}
                </Text>
                <Ionicons name="copy-outline" size={16} color={tw.color('accent-info')} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* TOTP code input */}
          <FieldLabel>6-DIGIT VERIFICATION CODE</FieldLabel>
          <View style={tw`mb-4`}>
            <InputRow icon="keypad-outline">
              <TextInput
                style={tw`flex-1 text-txt-primary text-sm py-3 tracking-widest text-center`}
                placeholder="000000"
                placeholderTextColor={tw.color('txt-dim')}
                value={code}
                onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            </InputRow>
          </View>
          <ErrorBox message={error} />
          <PrimaryButton
            icon="checkmark-circle-outline"
            label="Verify & Complete"
            loadingLabel="Verifying…"
            loading={loading}
            onPress={handleVerify}
          />
        </>
      )}
    </ModalShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   UNLOCK MODAL  (inline)
   ═══════════════════════════════════════════════════════════ */
function UnlockModal({ visible, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setShowPwd(false);
      setCode('');
      setError('');
      setLoading(false);
    }
  }, [visible]);

  async function handleUnlock() {
    setError('');
    if (!password) { setError('Master password is required.'); return; }
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit TOTP code.');
      return;
    }
    setLoading(true);
    try {
      const res = await vaultApi.unlockPasswordVault(password, code);
      if (res.ok) {
        const token = res.data.sessionToken || res.data.token;
        if (token) onSuccess(token);
        else setError('Unlock succeeded but no session token received.');
      } else {
        setError(res.data?.error || res.data?.message || 'Unlock failed. Check credentials.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Unlock Vault">
      {/* Master password */}
      <FieldLabel>MASTER PASSWORD</FieldLabel>
      <View style={tw`mb-4`}>
        <InputRow icon="lock-closed-outline">
          <TextInput
            style={tw`flex-1 text-txt-primary text-sm py-3`}
            placeholder="Enter master password"
            placeholderTextColor={tw.color('txt-dim')}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPwd((p) => !p)}>
            <Ionicons
              name={showPwd ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={tw.color('txt-dim')}
            />
          </TouchableOpacity>
        </InputRow>
      </View>

      {/* TOTP code */}
      <FieldLabel>AUTHENTICATOR CODE</FieldLabel>
      <View style={tw`mb-4`}>
        <InputRow icon="keypad-outline">
          <TextInput
            style={tw`flex-1 text-txt-primary text-sm py-3 tracking-widest text-center`}
            placeholder="000000"
            placeholderTextColor={tw.color('txt-dim')}
            value={code}
            onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />
        </InputRow>
      </View>

      <ErrorBox message={error} />
      <PrimaryButton
        icon="lock-open-outline"
        label="Unlock"
        loadingLabel="Unlocking…"
        loading={loading}
        onPress={handleUnlock}
      />
    </ModalShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADD ENTRY MODAL  (inline)
   ═══════════════════════════════════════════════════════════ */
function AddEntryModal({ visible, sessionToken, onClose, onSuccess }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFolders();
    } else {
      setSelectedFolderId('');
      setPassword('');
      setShowPwd(false);
      setNotes('');
      setError('');
      setLoading(false);
      setFolderPickerOpen(false);
    }
  }, [visible]);

  async function loadFolders() {
    setLoadingFolders(true);
    try {
      const list = await vaultApi.getFolders();
      setFolders(Array.isArray(list) ? list : []);
    } catch {
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  }

  async function handleSave() {
    setError('');
    if (!selectedFolderId) { setError('Please select a folder.'); return; }
    if (!password) { setError('Password is required.'); return; }
    setLoading(true);
    try {
      const res = await vaultApi.createPasswordVaultEntry(
        selectedFolderId,
        password,
        notes || undefined,
        sessionToken,
      );
      if (res.ok) {
        onSuccess();
      } else {
        setError(res.data?.error || res.data?.message || 'Failed to create entry.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectedFolder = folders.find((f) => (f._id || f.id) === selectedFolderId);

  return (
    <ModalShell visible={visible} onClose={onClose} title="Add Password Entry">
      {/* Folder picker */}
      <FieldLabel>FOLDER</FieldLabel>
      <View style={tw`mb-4`}>
        {loadingFolders ? (
          <View style={tw`flex-row items-center bg-vault-surface border border-vault-border-light rounded-xl px-3 py-3`}>
            <ActivityIndicator size="small" color={tw.color('accent-primary')} style={tw`mr-2`} />
            <Text style={tw`text-txt-muted text-sm`}>Loading folders…</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setFolderPickerOpen((p) => !p)}
              style={tw`flex-row items-center bg-vault-surface border border-vault-border-light rounded-xl px-3 py-3`}
              activeOpacity={0.7}
            >
              <Ionicons name="folder-outline" size={18} color={tw.color('txt-dim')} style={tw`mr-2`} />
              <Text
                style={[
                  tw`flex-1 text-sm`,
                  selectedFolder ? tw`text-txt-primary` : tw`text-txt-dim`,
                ]}
                numberOfLines={1}
              >
                {selectedFolder ? (selectedFolder.name) : 'Select a folder'}
              </Text>
              <Ionicons
                name={folderPickerOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={tw.color('txt-dim')}
              />
            </TouchableOpacity>

            {/* Dropdown list */}
            {folderPickerOpen && (
              <View style={tw`bg-vault-surface border border-vault-border-light rounded-xl mt-1 max-h-40 overflow-hidden`}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  {folders.length === 0 ? (
                    <Text style={tw`text-txt-muted text-sm px-3 py-3`}>No folders found.</Text>
                  ) : (
                    folders.map((f) => {
                      const fId = f._id || f.id;
                      const isActive = fId === selectedFolderId;
                      return (
                        <TouchableOpacity
                          key={fId}
                          onPress={() => {
                            setSelectedFolderId(fId);
                            setFolderPickerOpen(false);
                            setError('');
                          }}
                          style={[
                            tw`flex-row items-center px-3 py-3 border-b border-vault-border`,
                            isActive && tw`bg-accent-primary/10`,
                          ]}
                        >
                          <Ionicons
                            name={isActive ? 'folder' : 'folder-outline'}
                            size={16}
                            color={isActive ? tw.color('accent-primary') : tw.color('txt-dim')}
                            style={tw`mr-2`}
                          />
                          <Text
                            style={[
                              tw`text-sm flex-1`,
                              isActive ? tw`text-accent-primary font-semibold` : tw`text-txt-secondary`,
                            ]}
                            numberOfLines={1}
                          >
                            {f.name}
                          </Text>
                          {isActive && (
                            <Ionicons name="checkmark" size={18} color={tw.color('accent-primary')} />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </View>

      {/* Password */}
      <FieldLabel>PASSWORD</FieldLabel>
      <View style={tw`mb-4`}>
        <InputRow icon="key-outline">
          <TextInput
            style={tw`flex-1 text-txt-primary text-sm py-3`}
            placeholder="Enter password to store"
            placeholderTextColor={tw.color('txt-dim')}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPwd((p) => !p)}>
            <Ionicons
              name={showPwd ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={tw.color('txt-dim')}
            />
          </TouchableOpacity>
        </InputRow>
      </View>

      {/* Notes */}
      <FieldLabel>NOTES (OPTIONAL)</FieldLabel>
      <View style={tw`mb-5`}>
        <View style={tw`bg-vault-surface border border-vault-border-light rounded-xl px-3`}>
          <TextInput
            style={tw`text-txt-primary text-sm py-3`}
            placeholder="Add notes…"
            placeholderTextColor={tw.color('txt-dim')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>
      </View>

      <ErrorBox message={error} />
      <PrimaryButton
        icon="save-outline"
        label="Save Entry"
        loadingLabel="Saving…"
        loading={loading}
        onPress={handleSave}
      />
    </ModalShell>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT ENTRY MODAL  (inline)
   ═══════════════════════════════════════════════════════════ */
function EditEntryModal({ visible, entry, sessionToken, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill when entry changes
  useEffect(() => {
    if (entry && visible) {
      setPassword(entry.password || '');
      setNotes(entry.notes || '');
      setShowPwd(false);
      setError('');
      setLoading(false);
    }
  }, [entry, visible]);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setNotes('');
      setShowPwd(false);
      setError('');
      setLoading(false);
    }
  }, [visible]);

  async function handleSave() {
    setError('');
    if (!password) { setError('Password is required.'); return; }
    setLoading(true);
    try {
      const entryId = entry._id || entry.id;
      const res = await vaultApi.updatePasswordVaultEntry(entryId, password, notes || undefined, sessionToken);
      if (res.ok) {
        onSuccess();
      } else {
        setError(res.data?.error || res.data?.message || 'Failed to update entry.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Edit Password Entry">
      {/* Folder label (read-only) */}
      {entry && (
        <View style={tw`flex-row items-center bg-vault-surface rounded-xl px-3 py-2.5 mb-4`}>
          <Ionicons name="folder" size={16} color={tw.color('accent-primary')} style={tw`mr-2`} />
          <Text style={tw`text-txt-secondary text-sm`}>
            {entry.folderName || entry.folder?.name || 'Unknown Folder'}
          </Text>
        </View>
      )}

      {/* Password */}
      <FieldLabel>PASSWORD</FieldLabel>
      <View style={tw`mb-4`}>
        <InputRow icon="key-outline">
          <TextInput
            style={tw`flex-1 text-txt-primary text-sm py-3`}
            placeholder="Enter new password"
            placeholderTextColor={tw.color('txt-dim')}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity onPress={() => setShowPwd((p) => !p)}>
            <Ionicons
              name={showPwd ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={tw.color('txt-dim')}
            />
          </TouchableOpacity>
        </InputRow>
      </View>

      {/* Notes */}
      <FieldLabel>NOTES (OPTIONAL)</FieldLabel>
      <View style={tw`mb-5`}>
        <View style={tw`bg-vault-surface border border-vault-border-light rounded-xl px-3`}>
          <TextInput
            style={tw`text-txt-primary text-sm py-3`}
            placeholder="Add notes…"
            placeholderTextColor={tw.color('txt-dim')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>
      </View>

      <ErrorBox message={error} />
      <PrimaryButton
        icon="save-outline"
        label="Update Entry"
        loadingLabel="Updating…"
        loading={loading}
        onPress={handleSave}
      />
    </ModalShell>
  );
}
