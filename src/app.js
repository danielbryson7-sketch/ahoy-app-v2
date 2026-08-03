import { supabase } from './supabase.js';
import { signIn, signUp, signOut, getSession, onAuthStateChange } from './auth.js';

let authMode = 'login';
let currentUser = null;
let currentProfile = null;

const els = {};

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  cacheElements();
  bindEvents();

  onAuthStateChange(async (session) => {
    if (session?.user) {
      await openAuthenticatedApp(session.user);
    } else {
      showAuthPage();
    }
  });

  try {
    const session = await getSession();
    if (session?.user) {
      await openAuthenticatedApp(session.user);
    } else {
      showAuthPage();
    }
  } catch (error) {
    showAuthPage();
    showMessage(els.authMessage, error.message, 'error');
  }
}

function cacheElements() {
  [
    'loadingScreen','authPage','appPage','authForm','loginTab','signupTab',
    'displayNameField','displayNameInput','emailInput','passwordInput',
    'authSubmitButton','authMessage','logoutButton','profileImage',
    'profileAvatar','profileName','profileFlairs','profileEmail','adminBadge',
    'profileUserId','profileCreated','profileUpdated','editDisplayNameInput',
    'saveProfileButton','profileMessage','avatarInput','imageMessage'
  ].forEach((id) => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.loginTab.addEventListener('click', () => setAuthMode('login'));
  els.signupTab.addEventListener('click', () => setAuthMode('signup'));
  els.authForm.addEventListener('submit', handleAuthSubmit);
  els.logoutButton.addEventListener('click', handleLogout);
  els.saveProfileButton.addEventListener('click', saveProfile);
  els.avatarInput.addEventListener('change', uploadAvatar);
}

function setAuthMode(mode) {
  authMode = mode;
  const signingUp = mode === 'signup';
  els.loginTab.classList.toggle('active', !signingUp);
  els.signupTab.classList.toggle('active', signingUp);
  els.displayNameField.classList.toggle('hidden', !signingUp);
  els.displayNameInput.required = signingUp;
  els.passwordInput.autocomplete = signingUp ? 'new-password' : 'current-password';
  els.authSubmitButton.textContent = signingUp ? 'Create Account' : 'Come Aboard';
  showMessage(els.authMessage, '');
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = els.emailInput.value.trim();
  const password = els.passwordInput.value;
  const displayName = els.displayNameInput.value.trim();

  setBusy(els.authSubmitButton, true, authMode === 'signup' ? 'Creating…' : 'Boarding…');
  showMessage(els.authMessage, '');

  try {
    if (authMode === 'signup') {
      const data = await signUp(email, password, displayName);
      if (!data.session) {
        showMessage(els.authMessage, 'Account created. Check your email if confirmation is enabled.', 'success');
      }
    } else {
      await signIn(email, password);
    }
    els.authForm.reset();
  } catch (error) {
    showMessage(els.authMessage, error.message, 'error');
  } finally {
    setBusy(els.authSubmitButton, false, authMode === 'signup' ? 'Create Account' : 'Come Aboard');
  }
}

async function openAuthenticatedApp(user) {
  currentUser = user;
  showLoading();
  try {
    currentProfile = await loadProfile(user.id);
    renderProfile();
    showAppPage();
  } catch (error) {
    showAuthPage();
    showMessage(els.authMessage, error.message, 'error');
  }
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

function renderProfile() {
  const name = currentProfile.display_name || 'Crew Member';
  els.profileName.textContent = name;
  els.profileEmail.textContent = currentProfile.email || currentUser.email || '';
  els.profileUserId.textContent = currentProfile.id;
  els.profileCreated.textContent = formatDate(currentProfile.created_at);
  els.profileUpdated.textContent = formatDate(currentProfile.updated_at);
  els.editDisplayNameInput.value = name;
  els.adminBadge.classList.toggle('hidden', !currentProfile.is_admin);
  renderFlairs(currentProfile.flair || []);
  renderAvatar(currentProfile.profile_image_path, name);
}

function renderFlairs(flairs) {
  els.profileFlairs.innerHTML = '';
  flairs.forEach((flair) => {
    const badge = document.createElement('span');
    badge.className = 'flair-badge';
    badge.textContent = flair;
    els.profileFlairs.appendChild(badge);
  });
}

function renderAvatar(path, name) {
  const initial = name.substring(0, 1).toUpperCase();
  if (!path) {
    els.profileImage.classList.add('hidden');
    els.profileImage.removeAttribute('src');
    els.profileAvatar.textContent = initial;
    els.profileAvatar.classList.remove('hidden');
    return;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  els.profileImage.onload = () => {
    els.profileImage.classList.remove('hidden');
    els.profileAvatar.classList.add('hidden');
  };
  els.profileImage.onerror = () => {
    els.profileImage.classList.add('hidden');
    els.profileAvatar.textContent = initial;
    els.profileAvatar.classList.remove('hidden');
  };
  els.profileImage.src = `${data.publicUrl}?v=${Date.now()}`;
}

async function saveProfile() {
  const displayName = els.editDisplayNameInput.value.trim();
  if (!displayName) {
    showMessage(els.profileMessage, 'Enter a display name.', 'error');
    return;
  }

  setBusy(els.saveProfileButton, true, 'Saving…');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id)
      .select('*')
      .single();
    if (error) throw error;
    currentProfile = data;
    renderProfile();
    showMessage(els.profileMessage, 'Profile saved.', 'success');
  } catch (error) {
    showMessage(els.profileMessage, error.message, 'error');
  } finally {
    setBusy(els.saveProfileButton, false, 'Save Profile');
  }
}

async function uploadAvatar() {
  const file = els.avatarInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showMessage(els.imageMessage, 'Choose an image file.', 'error');
    return;
  }

  showMessage(els.imageMessage, 'Uploading picture…');
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${currentUser.id}/profile.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ profile_image_path: path, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    currentProfile = data;
    renderProfile();
    showMessage(els.imageMessage, 'Profile picture updated.', 'success');
  } catch (error) {
    showMessage(els.imageMessage, error.message, 'error');
  } finally {
    els.avatarInput.value = '';
  }
}

async function handleLogout() {
  setBusy(els.logoutButton, true, 'Leaving…');
  try {
    await signOut();
  } catch (error) {
    showMessage(els.profileMessage, error.message, 'error');
  } finally {
    setBusy(els.logoutButton, false, 'Log Out');
  }
}

function showLoading() {
  els.loadingScreen.classList.remove('hidden');
  els.authPage.classList.add('hidden');
  els.appPage.classList.add('hidden');
}

function showAuthPage() {
  currentUser = null;
  currentProfile = null;
  els.loadingScreen.classList.add('hidden');
  els.appPage.classList.add('hidden');
  els.authPage.classList.remove('hidden');
}

function showAppPage() {
  els.loadingScreen.classList.add('hidden');
  els.authPage.classList.add('hidden');
  els.appPage.classList.remove('hidden');
}

function setBusy(button, busy, text) {
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || text;
  }
}

function showMessage(element, text, type = '') {
  element.textContent = text || '';
  element.className = 'message';
  if (type) element.classList.add(type);
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
