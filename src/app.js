import { supabase } from './supabase.js';
import { signIn, signUp, signOut, getSession, onAuthStateChange } from './auth.js';

let authMode = 'login';
let currentUser = null;
let currentProfile = null;
let selectedPostImage = null;
let selectedNoteImage = null;
let showCompletedNotes = false;
let editingTallyId = null;
let durationTicker = null;
let flairCatalog = [];
let crewProfiles = [];
let feedChannel = null;
let authRequest = 0;
const els = {};

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  cacheElements();
  bindEvents();

  try {
    const session = await getSession();
    await handleSession(session);
  } catch (error) {
    showAuthPage();
    showMessage(els.authMessage, error.message, 'error');
  }

  onAuthStateChange((session) => {
    window.setTimeout(() => {
      handleSession(session).catch((error) => {
        showAuthPage();
        showMessage(els.authMessage, error.message, 'error');
      });
    }, 0);
  });
}

async function handleSession(session) {
  const request = ++authRequest;
  if (!session?.user) {
    cleanupRealtime();
    showAuthPage();
    return;
  }
  await openAuthenticatedApp(session.user, request);
}

function cacheElements() {
  [
    'loadingScreen','authPage','appPage','authForm','loginTab','signupTab',
    'displayNameField','displayNameInput','emailInput','passwordInput',
    'authSubmitButton','authMessage','logoutButton','profileImage',
    'profileAvatar','profileName','profileFlairs','profileEmail','adminBadge',
    'profileUserId','profileCreated','profileUpdated','editDisplayNameInput',
    'saveProfileButton','profileMessage','avatarInput','imageMessage',
    'deckView','notesView','talliesView','profileView','deckNavButton','notesNavButton','talliesNavButton','profileNavButton','deckBrandButton',
    'doubloonCount','composerAvatar','postBodyInput','postImageInput',
    'postImagePreviewWrap','postImagePreview','removePostImageButton',
    'createPostButton','postMessage','feedStatus','postFeed',
    'imageViewer','viewerImage','closeImageViewer',
    'myFlairOptions','saveMyFlairsButton','myFlairMessage','adminFlairSection',
    'adminFlairUserInput','adminFlairOptions','saveAdminFlairsButton','adminFlairMessage',
    'toggleCompletedNotesButton','noteBodyInput','noteDateInput','noteVisibilityInput',
    'openNotesFromDeckButton','deckNotesStatus','deckNotesList',
    'noteEarlyDaysInput','noteSharedUsersWrap','noteSharedUsersInput','noteImageInput',
    'noteImagePreviewWrap','noteImagePreview','removeNoteImageButton','createNoteButton',
    'noteMessage','notesStatus','notesList',
    'openTallyBuilderButton','closeTallyBuilderButton','cancelTallyBuilderButton','tallyBuilder',
    'tallyBuilderTitle','tallyNameInput','tallyTypeInput','tallyColorInput','tallyVisibilityInput',
    'tallyDisplayModeInput','tallyEmojiPicker','tallyEmojiInput',
    'toggleMessageFields','tallyOnMessageInput','tallyOffMessageInput','saveTallyButton',
    'tallyBuilderMessage','talliesStatus','toggleTalliesSection','counterTalliesSection',
    'durationTalliesSection','toggleTalliesGrid','counterTalliesGrid','durationTalliesGrid',
    'openTalliesFromDeckButton','deckTalliesStatus','deckToggleTalliesSection',
    'deckCounterTalliesSection','deckDurationTalliesSection','deckToggleTalliesGrid',
    'deckCounterTalliesGrid','deckDurationTalliesGrid'
  ].forEach((id) => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.loginTab.addEventListener('click', () => setAuthMode('login'));
  els.signupTab.addEventListener('click', () => setAuthMode('signup'));
  els.authForm.addEventListener('submit', handleAuthSubmit);
  els.logoutButton.addEventListener('click', handleLogout);
  els.saveProfileButton.addEventListener('click', saveProfile);
  els.saveMyFlairsButton.addEventListener('click', saveMyFlairs);
  els.adminFlairUserInput.addEventListener('change', renderAdminFlairOptions);
  els.saveAdminFlairsButton.addEventListener('click', saveAdminFlairs);
  els.avatarInput.addEventListener('change', uploadAvatar);
  els.deckNavButton.addEventListener('click', () => showView('deck'));
  els.deckBrandButton.addEventListener('click', () => showView('deck'));
  els.notesNavButton.addEventListener('click', () => showView('notes'));
  els.talliesNavButton.addEventListener('click', () => showView('tallies'));
  els.openNotesFromDeckButton.addEventListener('click', () => showView('notes'));
  els.profileNavButton.addEventListener('click', () => showView('profile'));
  els.postImageInput.addEventListener('change', previewPostImage);
  els.removePostImageButton.addEventListener('click', clearPostImage);
  els.createPostButton.addEventListener('click', createPost);
  els.noteVisibilityInput.addEventListener('change', updateNoteVisibilityUi);
  els.noteImageInput.addEventListener('change', previewNoteImage);
  els.removeNoteImageButton.addEventListener('click', clearNoteImage);
  els.createNoteButton.addEventListener('click', createNote);
  els.toggleCompletedNotesButton.addEventListener('click', toggleCompletedNotes);
  els.openTallyBuilderButton.addEventListener('click', () => openTallyBuilder());
  els.openTalliesFromDeckButton.addEventListener('click', () => showView('tallies'));
  els.closeTallyBuilderButton.addEventListener('click', closeTallyBuilder);
  els.cancelTallyBuilderButton.addEventListener('click', closeTallyBuilder);
  els.tallyTypeInput.addEventListener('change', updateTallyBuilderFields);
  els.tallyEmojiPicker.addEventListener('change', () => {
    els.tallyEmojiInput.value = els.tallyEmojiPicker.value;
  });
  els.saveTallyButton.addEventListener('click', saveTally);
  els.closeImageViewer.addEventListener('click', closeImageViewer);
  els.imageViewer.addEventListener('click', (event) => {
    if (event.target === els.imageViewer) closeImageViewer();
  });
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

async function openAuthenticatedApp(user, request) {
  currentUser = user;
  showLoading();

  try {
    const profile = await loadProfile(user.id);
    if (request !== authRequest) return;

    currentProfile = profile;
    renderProfile();
    setDefaultNoteDate();
    await loadShareableUsers();
    await loadFlairSystem();
    showAppPage();
    showView('deck');
    await Promise.all([loadDoubloons(), loadFeed(), loadDeckNotes(), loadDeckTallies()]);
    startRealtime();
  } catch (error) {
    if (request !== authRequest) return;
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

function showView(view) {
  const deck = view === 'deck';
  const notes = view === 'notes';
  const tallies = view === 'tallies';
  const profile = view === 'profile';

  els.deckView.classList.toggle('hidden', !deck);
  els.notesView.classList.toggle('hidden', !notes);
  els.talliesView.classList.toggle('hidden', !tallies);
  els.profileView.classList.toggle('hidden', !profile);

  els.deckNavButton.classList.toggle('active', deck);
  els.notesNavButton.classList.toggle('active', notes);
  els.talliesNavButton.classList.toggle('active', tallies);
  els.profileNavButton.classList.toggle('active', profile);

  if (deck) {
    loadFeed();
    loadDeckNotes();
    loadDeckTallies();
  }
  if (notes) loadNotes();
  if (tallies) loadTallies();
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
  els.adminFlairSection.classList.toggle('hidden', !currentProfile.is_admin);
  renderFlairs(currentProfile.flair || []);
  renderAvatar(currentProfile.profile_image_path, name);
  renderComposerAvatar(currentProfile.profile_image_path, name);
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

function getPublicUrl(bucket, path) {
  if (!path) return '';
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
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
  els.profileImage.src = `${getPublicUrl('avatars', path)}?v=${Date.now()}`;
  els.profileImage.onload = () => {
    els.profileImage.classList.remove('hidden');
    els.profileAvatar.classList.add('hidden');
  };
  els.profileImage.onerror = () => {
    els.profileImage.classList.add('hidden');
    els.profileAvatar.textContent = initial;
    els.profileAvatar.classList.remove('hidden');
  };
}

function renderComposerAvatar(path, name) {
  const initial = name.substring(0, 1).toUpperCase();
  if (path) {
    els.composerAvatar.innerHTML = `<img class="composer-avatar-image" src="${escapeAttr(getPublicUrl('avatars', path))}?v=${Date.now()}" alt="">`;
  } else {
    els.composerAvatar.textContent = initial;
  }
}



async function loadFlairSystem() {
  const [catalogResult, profilesResult] = await Promise.all([
    supabase.from('flair_catalog')
      .select('name, category, is_protected, is_user_selectable, sort_order')
      .order('sort_order'),
    supabase.from('profiles')
      .select('id, display_name, email, flair')
      .order('display_name')
  ]);

  if (catalogResult.error) throw catalogResult.error;
  if (profilesResult.error) throw profilesResult.error;

  flairCatalog = catalogResult.data || [];
  crewProfiles = profilesResult.data || [];

  renderMyFlairOptions();
  renderAdminUserOptions();
}

function renderMyFlairOptions() {
  els.myFlairOptions.innerHTML = '';
  const current = new Set(currentProfile.flair || []);
  const selectable = flairCatalog.filter((flair) => flair.is_user_selectable);

  selectable.forEach((flair) => {
    els.myFlairOptions.appendChild(buildFlairCheckbox(flair, current.has(flair.name), 'my'));
  });

  if (!selectable.length) {
    els.myFlairOptions.innerHTML = '<div class="empty-flair-message">No selectable flair is configured yet.</div>';
  }
}

function renderAdminUserOptions() {
  els.adminFlairUserInput.innerHTML = '';

  crewProfiles.forEach((profile) => {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.display_name || profile.email;
    els.adminFlairUserInput.appendChild(option);
  });

  if (currentProfile.is_admin) {
    els.adminFlairUserInput.value = currentUser.id;
    renderAdminFlairOptions();
  }
}

function renderAdminFlairOptions() {
  if (!currentProfile?.is_admin) return;

  const profile = crewProfiles.find((item) => item.id === els.adminFlairUserInput.value);
  const current = new Set(profile?.flair || []);
  els.adminFlairOptions.innerHTML = '';

  flairCatalog.forEach((flair) => {
    els.adminFlairOptions.appendChild(buildFlairCheckbox(flair, current.has(flair.name), 'admin'));
  });
}

function buildFlairCheckbox(flair, checked, scope) {
  const label = document.createElement('label');
  label.className = `flair-choice flair-category-${slugify(flair.category)}`;
  label.innerHTML = `
    <input type="checkbox" data-flair-scope="${scope}" value="${escapeAttr(flair.name)}" ${checked ? 'checked' : ''}>
    <span class="flair-choice-name">${escapeHtml(flair.name)}</span>
    <span class="flair-choice-category">${escapeHtml(flair.category)}</span>
  `;
  return label;
}

async function saveMyFlairs() {
  const selected = Array.from(
    document.querySelectorAll('input[data-flair-scope="my"]:checked')
  ).map((input) => input.value);

  setBusy(els.saveMyFlairsButton, true, 'Saving…');
  try {
    const { data, error } = await supabase.rpc('set_my_selectable_flairs', {
      selected_flairs: selected
    });
    if (error) throw error;

    currentProfile.flair = data || [];
    const me = crewProfiles.find((profile) => profile.id === currentUser.id);
    if (me) me.flair = currentProfile.flair;

    renderProfile();
    renderMyFlairOptions();
    showMessage(els.myFlairMessage, 'Flair saved.', 'success');
    await Promise.all([loadFeed(), loadDeckNotes()]);
  } catch (error) {
    showMessage(els.myFlairMessage, error.message, 'error');
  } finally {
    setBusy(els.saveMyFlairsButton, false, 'Save My Flair');
  }
}

async function saveAdminFlairs() {
  const targetUserId = els.adminFlairUserInput.value;
  const selected = Array.from(
    document.querySelectorAll('input[data-flair-scope="admin"]:checked')
  ).map((input) => input.value);

  setBusy(els.saveAdminFlairsButton, true, 'Saving…');
  try {
    const { data, error } = await supabase.rpc('admin_set_user_flairs', {
      target_user_id: targetUserId,
      selected_flairs: selected
    });
    if (error) throw error;

    const profile = crewProfiles.find((item) => item.id === targetUserId);
    if (profile) profile.flair = data || [];

    if (targetUserId === currentUser.id) {
      currentProfile.flair = data || [];
      renderProfile();
      renderMyFlairOptions();
    }

    renderAdminFlairOptions();
    showMessage(els.adminFlairMessage, 'Crew flair saved.', 'success');
    await Promise.all([loadFeed(), loadDeckNotes()]);
  } catch (error) {
    showMessage(els.adminFlairMessage, error.message, 'error');
  } finally {
    setBusy(els.saveAdminFlairsButton, false, 'Save Crew Flair');
  }
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


async function saveProfile() {
  const displayName = els.editDisplayNameInput.value.trim();
  if (!displayName) return showMessage(els.profileMessage, 'Enter a display name.', 'error');

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
    const crewProfile = crewProfiles.find((profile) => profile.id === currentUser.id);
    if (crewProfile) crewProfile.display_name = data.display_name;
    renderProfile();
    showMessage(els.profileMessage, 'Profile saved.', 'success');
    await loadFeed();
  } catch (error) {
    showMessage(els.profileMessage, error.message, 'error');
  } finally {
    setBusy(els.saveProfileButton, false, 'Save Profile');
  }
}

async function uploadAvatar() {
  const file = els.avatarInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return showMessage(els.imageMessage, 'Choose an image file.', 'error');

  showMessage(els.imageMessage, 'Uploading picture…');
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${currentUser.id}/profile.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('profiles')
      .update({ profile_image_path: path, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id)
      .select('*')
      .single();
    if (error) throw error;

    currentProfile = data;
    renderProfile();
    showMessage(els.imageMessage, 'Profile picture updated.', 'success');
    await loadFeed();
  } catch (error) {
    showMessage(els.imageMessage, error.message, 'error');
  } finally {
    els.avatarInput.value = '';
  }
}

function previewPostImage() {
  const file = els.postImageInput.files?.[0];
  if (!file) return clearPostImage();
  if (!file.type.startsWith('image/')) {
    clearPostImage();
    return showMessage(els.postMessage, 'Choose an image file.', 'error');
  }
  selectedPostImage = file;
  els.postImagePreview.src = URL.createObjectURL(file);
  els.postImagePreviewWrap.classList.remove('hidden');
}

function clearPostImage() {
  selectedPostImage = null;
  els.postImageInput.value = '';
  els.postImagePreview.removeAttribute('src');
  els.postImagePreviewWrap.classList.add('hidden');
}

async function createPost() {
  const body = els.postBodyInput.value.trim();
  if (!body && !selectedPostImage) {
    return showMessage(els.postMessage, 'Write something or add a photo.', 'error');
  }

  setBusy(els.createPostButton, true, 'Posting…');
  showMessage(els.postMessage, '');

  try {
    let imagePath = null;
    if (selectedPostImage) {
      const ext = (selectedPostImage.name.split('.').pop() || 'jpg').toLowerCase();
      imagePath = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('content-images')
        .upload(imagePath, selectedPostImage, {
          contentType: selectedPostImage.type,
          upsert: false
        });
      if (error) throw error;
    }

    const { error } = await supabase.from('posts').insert({
      author_id: currentUser.id,
      body,
      image_path: imagePath
    });
    if (error) throw error;

    els.postBodyInput.value = '';
    clearPostImage();
    showMessage(els.postMessage, 'Posted to the Deck.', 'success');
    await Promise.all([loadFeed(), loadDoubloons()]);
  } catch (error) {
    showMessage(els.postMessage, error.message, 'error');
  } finally {
    setBusy(els.createPostButton, false, 'Post to Deck');
  }
}

async function loadFeed() {
  if (!currentUser) return;
  els.feedStatus.textContent = 'Loading posts…';

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, author_id, body, image_path, created_at,
      profiles!posts_author_id_fkey(display_name, flair, profile_image_path),
      post_reactions(user_id, reaction),
      comments(
        id, author_id, body, created_at,
        profiles!comments_author_id_fkey(display_name, flair, profile_image_path)
      )
    `)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'comments', ascending: true })
    .limit(50);

  if (error) {
    els.feedStatus.textContent = error.message;
    return;
  }

  els.feedStatus.textContent = data.length ? '' : 'No posts yet. Be the first one on deck.';
  renderFeed(data || []);
}

function renderFeed(posts) {
  els.postFeed.innerHTML = '';
  posts.forEach((post) => els.postFeed.appendChild(buildPostCard(post)));
}

function buildPostCard(post) {
  const profile = post.profiles || {};
  const reactions = post.post_reactions || [];
  const comments = post.comments || [];
  const likes = reactions.filter((item) => item.reaction === 'like').length;
  const dislikes = reactions.filter((item) => item.reaction === 'dislike').length;
  const mine = reactions.find((item) => item.user_id === currentUser.id)?.reaction;

  const card = document.createElement('article');
  card.className = 'post-card panel';
  card.innerHTML = `
    <div class="post-author">
      ${avatarMarkup(profile, 'post-avatar')}
      <div class="author-copy">
        <div class="author-line">
          <strong>${escapeHtml(profile.display_name || 'Crew Member')}</strong>
          ${flairMarkup(profile.flair || [])}
        </div>
        <time>${escapeHtml(formatRelative(post.created_at))}</time>
      </div>
      ${post.author_id === currentUser.id || currentProfile.is_admin
        ? `<button class="icon-button delete-post" title="Delete post">🗑️</button>` : ''}
    </div>
    ${post.body ? `<div class="post-body">${linkify(post.body)}</div>` : ''}
    ${post.image_path ? `<img class="post-image" src="${escapeAttr(getPublicUrl('content-images', post.image_path))}" alt="Post attachment">` : ''}
    <div class="reaction-row">
      <button class="reaction-button ${mine === 'like' ? 'selected' : ''}" data-reaction="like">👍 <span>${likes}</span></button>
      <button class="reaction-button ${mine === 'dislike' ? 'selected' : ''}" data-reaction="dislike">👎 <span>${dislikes}</span></button>
      <span class="comment-count">💬 ${comments.length}</span>
    </div>
    <div class="comments"></div>
    <form class="comment-form">
      <input maxlength="800" placeholder="Write a comment…" required>
      <button type="submit">Send</button>
    </form>
  `;

  const image = card.querySelector('.post-image');
  if (image) image.addEventListener('click', () => openImageViewer(image.src));

  card.querySelectorAll('.reaction-button').forEach((button) => {
    button.addEventListener('click', () => toggleReaction(post.id, button.dataset.reaction, mine));
  });

  const deleteButton = card.querySelector('.delete-post');
  if (deleteButton) deleteButton.addEventListener('click', () => deletePost(post));

  const commentsWrap = card.querySelector('.comments');
  comments.forEach((comment) => commentsWrap.appendChild(buildComment(comment)));

  card.querySelector('.comment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = event.currentTarget.querySelector('input');
    await addComment(post.id, input.value.trim(), input);
  });

  return card;
}

function buildComment(comment) {
  const profile = comment.profiles || {};
  const row = document.createElement('div');
  row.className = 'comment';
  row.innerHTML = `
    ${avatarMarkup(profile, 'comment-avatar')}
    <div class="comment-bubble">
      <div class="comment-name">${escapeHtml(profile.display_name || 'Crew Member')} ${flairMarkup(profile.flair || [])}</div>
      <div>${linkify(comment.body)}</div>
      <time>${escapeHtml(formatRelative(comment.created_at))}</time>
    </div>
    ${comment.author_id === currentUser.id || currentProfile.is_admin
      ? `<button class="icon-button delete-comment" title="Delete comment">×</button>` : ''}
  `;
  const button = row.querySelector('.delete-comment');
  if (button) button.addEventListener('click', () => deleteComment(comment.id));
  return row;
}

function avatarMarkup(profile, className) {
  const name = profile.display_name || 'Crew Member';
  const path = profile.profile_image_path;
  if (path) {
    return `<img class="${className}" src="${escapeAttr(getPublicUrl('avatars', path))}" alt="">`;
  }
  return `<div class="${className} avatar-fallback">${escapeHtml(name.substring(0, 1).toUpperCase())}</div>`;
}

function flairMarkup(flairs) {
  return flairs.map((flair) => `<span class="tiny-flair">${escapeHtml(flair)}</span>`).join('');
}

async function toggleReaction(postId, reaction, currentReaction) {
  try {
    if (currentReaction === reaction) {
      const { error } = await supabase.from('post_reactions')
        .delete().eq('post_id', postId).eq('user_id', currentUser.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('post_reactions').upsert({
        post_id: postId,
        user_id: currentUser.id,
        reaction
      }, { onConflict: 'post_id,user_id' });
      if (error) throw error;
    }
    await Promise.all([loadFeed(), loadDoubloons()]);
  } catch (error) {
    alert(error.message);
  }
}

async function addComment(postId, body, input) {
  if (!body) return;
  input.disabled = true;
  try {
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: currentUser.id,
      body
    });
    if (error) throw error;
    input.value = '';
    await Promise.all([loadFeed(), loadDoubloons()]);
  } catch (error) {
    alert(error.message);
  } finally {
    input.disabled = false;
    input.focus();
  }
}

async function deletePost(post) {
  if (!confirm('Delete this post?')) return;
  try {
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) throw error;
    if (post.image_path) {
      await supabase.storage.from('content-images').remove([post.image_path]);
    }
    await Promise.all([loadFeed(), loadDoubloons()]);
  } catch (error) {
    alert(error.message);
  }
}

async function deleteComment(commentId) {
  if (!confirm('Delete this comment?')) return;
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) return alert(error.message);
  await Promise.all([loadFeed(), loadDoubloons()]);
}

async function loadDoubloons() {
  if (!currentUser) return;
  const [posts, comments, received, tallyEvents] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', currentUser.id),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('author_id', currentUser.id),
    supabase.from('post_reactions')
      .select('post_id, posts!inner(author_id)', { count: 'exact' })
      .eq('reaction', 'like')
      .eq('posts.author_id', currentUser.id),
    supabase.from('tally_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
  ]);
  const total =
    (posts.count || 0) * 5 +
    (comments.count || 0) * 2 +
    (received.count || 0) +
    (tallyEvents.count || 0);
  els.doubloonCount.textContent = total;
}

function startRealtime() {
  cleanupRealtime();
  feedChannel = supabase.channel('deck-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, refreshDeck)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refreshDeck)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, refreshDeck)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, refreshNotes)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'note_shares' }, refreshNotes)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tallies' }, refreshTallies)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tally_events' }, refreshTallies)
    .subscribe();
}

function refreshDeck() {
  window.clearTimeout(refreshDeck.timer);
  refreshDeck.timer = window.setTimeout(() => {
    loadFeed();
    loadDoubloons();
  }, 250);
}

function refreshNotes() {
  window.clearTimeout(refreshNotes.timer);
  refreshNotes.timer = window.setTimeout(() => {
    if (!els.notesView.classList.contains('hidden')) loadNotes();
    loadDeckNotes();
  }, 250);
}

function refreshTallies() {
  window.clearTimeout(refreshTallies.timer);
  refreshTallies.timer = window.setTimeout(() => {
    if (!els.talliesView.classList.contains('hidden')) loadTallies();
    loadDeckTallies();
  }, 250);
}

function cleanupRealtime() {
  if (feedChannel) {
    supabase.removeChannel(feedChannel);
    feedChannel = null;
  }
}


function setDefaultNoteDate() {
  if (!els.noteDateInput.value) {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    els.noteDateInput.value = local.toISOString().slice(0, 10);
  }
}

async function loadShareableUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .neq('id', currentUser.id)
    .order('display_name');

  if (error) return;

  els.noteSharedUsersInput.innerHTML = '';
  (data || []).forEach((profile) => {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.display_name || profile.email;
    els.noteSharedUsersInput.appendChild(option);
  });
}

function updateNoteVisibilityUi() {
  const shared = els.noteVisibilityInput.value === 'shared';
  els.noteSharedUsersWrap.classList.toggle('hidden', !shared);
}

function previewNoteImage() {
  const file = els.noteImageInput.files?.[0];
  if (!file) return clearNoteImage();
  if (!file.type.startsWith('image/')) {
    clearNoteImage();
    return showMessage(els.noteMessage, 'Choose an image file.', 'error');
  }
  selectedNoteImage = file;
  els.noteImagePreview.src = URL.createObjectURL(file);
  els.noteImagePreviewWrap.classList.remove('hidden');
}

function clearNoteImage() {
  selectedNoteImage = null;
  els.noteImageInput.value = '';
  els.noteImagePreview.removeAttribute('src');
  els.noteImagePreviewWrap.classList.add('hidden');
}

async function createNote() {
  const body = els.noteBodyInput.value.trim();
  const noteDate = els.noteDateInput.value;
  const visibility = els.noteVisibilityInput.value;
  const earlyDays = Number(els.noteEarlyDaysInput.value || 0);
  const sharedUserIds = Array.from(els.noteSharedUsersInput.selectedOptions).map((option) => option.value);

  if (!body && !selectedNoteImage) {
    return showMessage(els.noteMessage, 'Write a note or add a photo.', 'error');
  }
  if (!noteDate) {
    return showMessage(els.noteMessage, 'Choose a date.', 'error');
  }
  if (visibility === 'shared' && !sharedUserIds.length) {
    return showMessage(els.noteMessage, 'Choose at least one person to share with.', 'error');
  }

  setBusy(els.createNoteButton, true, 'Saving…');
  showMessage(els.noteMessage, '');

  try {
    let imagePath = null;
    if (selectedNoteImage) {
      const ext = (selectedNoteImage.name.split('.').pop() || 'jpg').toLowerCase();
      imagePath = `${currentUser.id}/notes/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(imagePath, selectedNoteImage, {
          contentType: selectedNoteImage.type,
          upsert: false
        });
      if (uploadError) throw uploadError;
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        owner_id: currentUser.id,
        body,
        note_date: noteDate,
        visibility,
        show_early_days: earlyDays,
        image_path: imagePath
      })
      .select('id')
      .single();
    if (error) throw error;

    if (visibility === 'shared') {
      const rows = sharedUserIds.map((userId) => ({
        note_id: note.id,
        user_id: userId
      }));
      const { error: shareError } = await supabase.from('note_shares').insert(rows);
      if (shareError) throw shareError;
    }

    els.noteBodyInput.value = '';
    els.noteVisibilityInput.value = 'private';
    els.noteEarlyDaysInput.value = '0';
    Array.from(els.noteSharedUsersInput.options).forEach((option) => { option.selected = false; });
    updateNoteVisibilityUi();
    clearNoteImage();
    showMessage(els.noteMessage, 'Note saved.', 'success');
    await Promise.all([loadNotes(), loadDeckNotes()]);
  } catch (error) {
    showMessage(els.noteMessage, error.message, 'error');
  } finally {
    setBusy(els.createNoteButton, false, 'Save Note');
  }
}


async function loadDeckNotes() {
  if (!currentUser) return;
  els.deckNotesStatus.textContent = 'Loading notes…';

  const { data, error } = await supabase
    .from('notes')
    .select(`
      id, owner_id, body, note_date, visibility, show_early_days,
      image_path, completed_at, completed_by, created_at,
      profiles!notes_owner_id_fkey(display_name, flair, profile_image_path),
      note_shares(user_id)
    `)
    .is('completed_at', null)
    .order('note_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    els.deckNotesStatus.textContent = error.message;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visible = (data || []).filter((note) => {
    const noteDate = new Date(`${note.note_date}T00:00:00`);
    const firstVisible = new Date(noteDate);
    firstVisible.setDate(firstVisible.getDate() - Number(note.show_early_days || 0));
    return today >= firstVisible;
  });

  els.deckNotesStatus.textContent = visible.length
    ? ''
    : 'No active notes to show right now.';

  els.deckNotesList.innerHTML = '';
  visible.slice(0, 8).forEach((note) => {
    els.deckNotesList.appendChild(buildDeckNoteCard(note));
  });
}

function buildDeckNoteCard(note) {
  const profile = note.profiles || {};
  const mine = note.owner_id === currentUser.id;
  const sharedWithMe = (note.note_shares || []).some((share) => share.user_id === currentUser.id);

  const card = document.createElement('article');
  card.className = 'deck-note-card';
  card.innerHTML = `
    <label class="note-check-wrap">
      <input class="note-check" type="checkbox">
      <span></span>
    </label>
    <div class="deck-note-copy">
      <div class="deck-note-topline">
        <strong>${escapeHtml(mine ? 'My Note' : (profile.display_name || 'Crew Note'))}</strong>
        <span class="deck-note-date">${escapeHtml(formatNoteDate(note.note_date))}</span>
      </div>
      ${note.body ? `<div class="deck-note-body">${linkify(note.body)}</div>` : ''}
      <div class="deck-note-meta">${escapeHtml(visibilityLabel(note.visibility, sharedWithMe))}</div>
    </div>
    ${note.image_path
      ? `<img class="deck-note-thumb" src="${escapeAttr(getPublicUrl('content-images', note.image_path))}" alt="Note attachment">`
      : ''}
  `;

  const checkbox = card.querySelector('.note-check');
  checkbox.addEventListener('change', async () => {
    await toggleNoteCompleted(note.id, checkbox.checked);
    await loadDeckNotes();
  });

  const image = card.querySelector('.deck-note-thumb');
  if (image) image.addEventListener('click', () => openImageViewer(image.src));

  return card;
}


async function loadNotes() {
  if (!currentUser) return;
  els.notesStatus.textContent = 'Loading notes…';

  const { data, error } = await supabase
    .from('notes')
    .select(`
      id, owner_id, body, note_date, visibility, show_early_days,
      image_path, completed_at, completed_by, created_at,
      profiles!notes_owner_id_fkey(display_name, flair, profile_image_path),
      note_shares(user_id)
    `)
    .order('note_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    els.notesStatus.textContent = error.message;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visible = (data || []).filter((note) => {
    const completed = Boolean(note.completed_at);
    if (completed !== showCompletedNotes) return false;

    if (completed) return true;

    const noteDate = new Date(`${note.note_date}T00:00:00`);
    const firstVisible = new Date(noteDate);
    firstVisible.setDate(firstVisible.getDate() - Number(note.show_early_days || 0));
    return today >= firstVisible;
  });

  els.notesStatus.textContent = visible.length
    ? ''
    : showCompletedNotes
      ? 'No completed notes.'
      : 'No active notes to show yet.';

  renderNotes(visible);
}

function renderNotes(notes) {
  els.notesList.innerHTML = '';
  notes.forEach((note) => els.notesList.appendChild(buildNoteCard(note)));
}

function buildNoteCard(note) {
  const profile = note.profiles || {};
  const completed = Boolean(note.completed_at);
  const mine = note.owner_id === currentUser.id;
  const sharedWithMe = (note.note_shares || []).some((share) => share.user_id === currentUser.id);

  const card = document.createElement('article');
  card.className = `note-card panel ${completed ? 'completed' : ''}`;
  card.innerHTML = `
    <div class="note-header">
      <label class="note-check-wrap">
        <input class="note-check" type="checkbox" ${completed ? 'checked' : ''}>
        <span></span>
      </label>
      <div class="note-title-wrap">
        <div class="note-owner-line">
          <strong>${escapeHtml(mine ? 'My Note' : (profile.display_name || 'Crew Note'))}</strong>
          ${flairMarkup(profile.flair || [])}
        </div>
        <div class="note-meta">
          <span>${escapeHtml(formatNoteDate(note.note_date))}</span>
          <span>•</span>
          <span>${escapeHtml(visibilityLabel(note.visibility, sharedWithMe))}</span>
        </div>
      </div>
      ${mine || currentProfile.is_admin
        ? `<button class="icon-button delete-note" title="Delete note">🗑️</button>` : ''}
    </div>
    ${note.body ? `<div class="note-body">${linkify(note.body)}</div>` : ''}
    ${note.image_path ? `<img class="note-image" src="${escapeAttr(getPublicUrl('content-images', note.image_path))}" alt="Note attachment">` : ''}
    ${completed ? `<div class="completed-line">Completed ${escapeHtml(formatRelative(note.completed_at))}</div>` : ''}
  `;

  const checkbox = card.querySelector('.note-check');
  checkbox.addEventListener('change', () => toggleNoteCompleted(note.id, checkbox.checked));

  const deleteButton = card.querySelector('.delete-note');
  if (deleteButton) deleteButton.addEventListener('click', () => deleteNote(note));

  const image = card.querySelector('.note-image');
  if (image) image.addEventListener('click', () => openImageViewer(image.src));

  return card;
}

function visibilityLabel(visibility, sharedWithMe) {
  if (visibility === 'public') return 'Public';
  if (visibility === 'shared') return sharedWithMe ? 'Shared with you' : 'Shared';
  return 'Private';
}

async function toggleNoteCompleted(noteId, completed) {
  const payload = completed
    ? { completed_at: new Date().toISOString(), completed_by: currentUser.id }
    : { completed_at: null, completed_by: null };

  const { error } = await supabase.from('notes').update(payload).eq('id', noteId);
  if (error) return alert(error.message);
  await Promise.all([loadNotes(), loadDeckNotes()]);
}

async function deleteNote(note) {
  if (!confirm('Delete this note?')) return;

  const { error } = await supabase.from('notes').delete().eq('id', note.id);
  if (error) return alert(error.message);

  if (note.image_path) {
    await supabase.storage.from('content-images').remove([note.image_path]);
  }

  await Promise.all([loadNotes(), loadDeckNotes()]);
}

function toggleCompletedNotes() {
  showCompletedNotes = !showCompletedNotes;
  els.toggleCompletedNotesButton.textContent = showCompletedNotes ? 'Show Active' : 'Show Completed';
  loadNotes();
}

function formatNoteDate(value) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}




async function loadDeckTallies() {
  if (!currentUser) return;
  els.deckTalliesStatus.textContent = 'Loading tallies…';

  const { data, error } = await supabase
    .from('tallies')
    .select(`
      id, owner_id, name, type, color, visibility, display_mode, emoji,
      on_message, off_message, created_at,
      profiles!tallies_owner_id_fkey(display_name),
      tally_events(id, event_type, amount, started_at, ended_at, created_at)
    `)
    .order('created_at', { ascending: true });

  if (error) {
    els.deckTalliesStatus.textContent = error.message;
    return;
  }

  renderDeckTallies(data || []);
}

function renderDeckTallies(tallies) {
  els.deckToggleTalliesGrid.innerHTML = '';
  els.deckCounterTalliesGrid.innerHTML = '';
  els.deckDurationTalliesGrid.innerHTML = '';

  const groups = {
    toggle: tallies.filter((tally) => tally.type === 'toggle'),
    counter: tallies.filter((tally) => tally.type === 'counter'),
    duration: tallies.filter((tally) => tally.type === 'duration')
  };

  groups.toggle.forEach((tally) => els.deckToggleTalliesGrid.appendChild(buildDeckTallyButton(tally)));
  groups.counter.forEach((tally) => els.deckCounterTalliesGrid.appendChild(buildDeckTallyButton(tally)));
  groups.duration.forEach((tally) => els.deckDurationTalliesGrid.appendChild(buildDeckTallyButton(tally)));

  els.deckToggleTalliesSection.classList.toggle('hidden', !groups.toggle.length);
  els.deckCounterTalliesSection.classList.toggle('hidden', !groups.counter.length);
  els.deckDurationTalliesSection.classList.toggle('hidden', !groups.duration.length);

  els.deckTalliesStatus.textContent = tallies.length
    ? ''
    : 'No tallies yet. Add one from the Tallies page.';

  startDurationTicker();
}

function buildDeckTallyButton(tally) {
  const events = tally.tally_events || [];
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `deck-tally-button tally-${tally.color || 'gold'} display-${tally.display_mode || 'text'}`;

  const visual = tallyVisualMarkup(tally);

  if (tally.type === 'counter') {
    const count = events
      .filter((event) => event.event_type === 'increment')
      .reduce((sum, event) => sum + Number(event.amount || 1), 0);

    button.innerHTML = `
      ${visual}
      <span class="deck-tally-overlay">
        <span class="deck-tally-value">${count}</span>
        <span class="deck-tally-label">${escapeHtml(tally.name)}</span>
      </span>
    `;
    button.addEventListener('click', () => incrementTally(tally.id));
  }

  if (tally.type === 'toggle') {
    const today = localDateString(new Date());
    const todayEvent = events
      .filter((event) => event.event_type === 'toggle' && localDateString(new Date(event.created_at)) === today)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const on = Boolean(todayEvent && Number(todayEvent.amount) === 1);

    button.classList.toggle('is-on', on);
    button.innerHTML = `
      ${visual}
      <span class="deck-tally-overlay">
        <span class="deck-tally-value">${on ? 'ON' : 'OFF'}</span>
        <span class="deck-tally-label">${escapeHtml(tally.name)}</span>
        <span class="deck-tally-message">${escapeHtml(on ? (tally.on_message || 'Done for today') : (tally.off_message || 'Not done yet'))}</span>
      </span>
    `;
    button.addEventListener('click', () => setToggleTally(tally, !on));
  }

  if (tally.type === 'duration') {
    const running = events
      .filter((event) => event.event_type === 'duration' && event.started_at && !event.ended_at)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
    const completedSeconds = events
      .filter((event) => event.event_type === 'duration' && event.started_at && event.ended_at)
      .reduce((sum, event) => sum + Math.max(0, (new Date(event.ended_at) - new Date(event.started_at)) / 1000), 0);

    button.classList.toggle('is-running', Boolean(running));
    button.innerHTML = `
      ${visual}
      <span class="deck-tally-overlay">
        <span class="deck-tally-value deck-duration-display"
          data-started-at="${running?.started_at || ''}"
          data-base-seconds="${completedSeconds}">
          ${formatDuration(completedSeconds + (running ? (Date.now() - new Date(running.started_at)) / 1000 : 0))}
        </span>
        <span class="deck-tally-label">${escapeHtml(tally.name)}</span>
        <span class="deck-tally-message">${running ? 'Tap to stop' : 'Tap to start'}</span>
      </span>
    `;
    button.addEventListener('click', () => (
      running ? stopDurationTally(running.id) : startDurationTally(tally.id)
    ));
  }

  return button;
}

function tallyVisualMarkup(tally) {
  const mode = tally.display_mode || 'text';
  const emoji = tally.emoji || '';

  if ((mode === 'emoji' || mode === 'both') && emoji) {
    return `<span class="deck-tally-emoji" aria-hidden="true">${escapeHtml(emoji)}</span>`;
  }

  return `<span class="deck-tally-text-art" aria-hidden="true">${escapeHtml(tally.name)}</span>`;
}


function openTallyBuilder(tally = null) {
  editingTallyId = tally?.id || null;
  els.tallyBuilderTitle.textContent = tally ? 'Edit Tally' : 'Create Tally';
  els.saveTallyButton.textContent = tally ? 'Save Changes' : 'Create Tally';
  els.tallyNameInput.value = tally?.name || '';
  els.tallyTypeInput.value = tally?.type || 'counter';
  els.tallyColorInput.value = tally?.color || 'gold';
  els.tallyVisibilityInput.value = tally?.visibility || 'private';
  els.tallyDisplayModeInput.value = tally?.display_mode || 'text';
  els.tallyEmojiInput.value = tally?.emoji || '';
  els.tallyEmojiPicker.value = tally?.emoji || '';
  els.tallyOnMessageInput.value = tally?.on_message || '';
  els.tallyOffMessageInput.value = tally?.off_message || '';
  updateTallyBuilderFields();
  showMessage(els.tallyBuilderMessage, '');
  els.tallyBuilder.classList.remove('hidden');
  els.tallyNameInput.focus();
  els.tallyBuilder.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeTallyBuilder() {
  editingTallyId = null;
  els.tallyBuilder.classList.add('hidden');
  showMessage(els.tallyBuilderMessage, '');
}

function updateTallyBuilderFields() {
  els.toggleMessageFields.classList.toggle('hidden', els.tallyTypeInput.value !== 'toggle');
}

async function saveTally() {
  const name = els.tallyNameInput.value.trim();
  if (!name) {
    return showMessage(els.tallyBuilderMessage, 'Enter a tally name.', 'error');
  }

  const payload = {
    owner_id: currentUser.id,
    name,
    type: els.tallyTypeInput.value,
    color: els.tallyColorInput.value,
    visibility: els.tallyVisibilityInput.value,
    display_mode: els.tallyDisplayModeInput.value,
    emoji: (els.tallyEmojiInput.value.trim() || els.tallyEmojiPicker.value || null),
    on_message: els.tallyTypeInput.value === 'toggle'
      ? (els.tallyOnMessageInput.value.trim() || 'Done for today')
      : null,
    off_message: els.tallyTypeInput.value === 'toggle'
      ? (els.tallyOffMessageInput.value.trim() || 'Not done yet')
      : null,
    updated_at: new Date().toISOString()
  };

  setBusy(els.saveTallyButton, true, editingTallyId ? 'Saving…' : 'Creating…');

  try {
    let error;
    if (editingTallyId) {
      ({ error } = await supabase.from('tallies')
        .update(payload)
        .eq('id', editingTallyId));
    } else {
      ({ error } = await supabase.from('tallies').insert(payload));
    }
    if (error) throw error;

    closeTallyBuilder();
    await Promise.all([loadTallies(), loadDeckTallies()]);
  } catch (error) {
    showMessage(els.tallyBuilderMessage, error.message, 'error');
  } finally {
    setBusy(els.saveTallyButton, false, editingTallyId ? 'Save Changes' : 'Create Tally');
  }
}

async function loadTallies() {
  if (!currentUser) return;
  els.talliesStatus.textContent = 'Loading tallies…';

  const { data, error } = await supabase
    .from('tallies')
    .select(`
      id, owner_id, name, type, color, visibility, display_mode, emoji, on_message, off_message, created_at,
      profiles!tallies_owner_id_fkey(display_name),
      tally_events(id, event_type, amount, started_at, ended_at, created_at)
    `)
    .order('created_at', { ascending: true });

  if (error) {
    els.talliesStatus.textContent = error.message;
    return;
  }

  renderTallies(data || []);
}

function renderTallies(tallies) {
  els.toggleTalliesGrid.innerHTML = '';
  els.counterTalliesGrid.innerHTML = '';
  els.durationTalliesGrid.innerHTML = '';

  const groups = {
    toggle: tallies.filter((t) => t.type === 'toggle'),
    counter: tallies.filter((t) => t.type === 'counter'),
    duration: tallies.filter((t) => t.type === 'duration')
  };

  groups.toggle.forEach((t) => els.toggleTalliesGrid.appendChild(buildTallyCard(t)));
  groups.counter.forEach((t) => els.counterTalliesGrid.appendChild(buildTallyCard(t)));
  groups.duration.forEach((t) => els.durationTalliesGrid.appendChild(buildTallyCard(t)));

  els.toggleTalliesSection.classList.toggle('hidden', !groups.toggle.length);
  els.counterTalliesSection.classList.toggle('hidden', !groups.counter.length);
  els.durationTalliesSection.classList.toggle('hidden', !groups.duration.length);
  els.talliesStatus.textContent = tallies.length ? '' : 'No tallies yet. Create your first one.';

  startDurationTicker();
}

function buildTallyCard(tally) {
  const mine = tally.owner_id === currentUser.id;
  const events = tally.tally_events || [];
  const card = document.createElement('article');
  card.className = `tally-card tally-${tally.color || 'gold'}`;

  const ownerLabel = mine ? '' : `<div class="tally-owner">${escapeHtml(tally.profiles?.display_name || 'Crew Member')}</div>`;
  const menu = mine || currentProfile.is_admin
    ? `<div class="tally-menu">
         ${mine ? '<button class="icon-button edit-tally" title="Edit">✏️</button>' : ''}
         <button class="icon-button delete-tally" title="Delete">🗑️</button>
       </div>`
    : '';

  if (tally.type === 'counter') {
    const count = events
      .filter((event) => event.event_type === 'increment')
      .reduce((sum, event) => sum + Number(event.amount || 1), 0);

    card.innerHTML = `
      ${menu}
      ${ownerLabel}
      <div class="tally-name">${escapeHtml(tally.name)}</div>
      <div class="tally-value">${count}</div>
      <button class="tally-action counter-action" type="button">+1</button>
      <div class="tally-subtext">${escapeHtml(formatLastEvent(events))}</div>
    `;
    card.querySelector('.counter-action').addEventListener('click', () => incrementTally(tally.id));
  }

  if (tally.type === 'toggle') {
    const today = localDateString(new Date());
    const todayEvent = events
      .filter((event) => event.event_type === 'toggle' && localDateString(new Date(event.created_at)) === today)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const on = Boolean(todayEvent && Number(todayEvent.amount) === 1);

    card.classList.toggle('is-on', on);
    card.innerHTML = `
      ${menu}
      ${ownerLabel}
      <div class="tally-name">${escapeHtml(tally.name)}</div>
      <button class="toggle-action ${on ? 'on' : ''}" type="button">
        <span class="toggle-state">${on ? 'ON' : 'OFF'}</span>
        <span class="toggle-message">${escapeHtml(on ? (tally.on_message || 'Done for today') : (tally.off_message || 'Not done yet'))}</span>
      </button>
      <div class="tally-subtext">${on && todayEvent ? `Tapped ${escapeHtml(formatTime(todayEvent.created_at))}` : 'Resets daily'}</div>
    `;
    card.querySelector('.toggle-action').addEventListener('click', () => setToggleTally(tally, !on));
  }

  if (tally.type === 'duration') {
    const running = events
      .filter((event) => event.event_type === 'duration' && event.started_at && !event.ended_at)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
    const completedSeconds = events
      .filter((event) => event.event_type === 'duration' && event.started_at && event.ended_at)
      .reduce((sum, event) => sum + Math.max(0, (new Date(event.ended_at) - new Date(event.started_at)) / 1000), 0);

    card.classList.toggle('is-running', Boolean(running));
    card.innerHTML = `
      ${menu}
      ${ownerLabel}
      <div class="tally-name">${escapeHtml(tally.name)}</div>
      <div class="duration-display" data-started-at="${running?.started_at || ''}" data-base-seconds="${completedSeconds}">
        ${formatDuration(completedSeconds + (running ? (Date.now() - new Date(running.started_at)) / 1000 : 0))}
      </div>
      <button class="tally-action duration-action" type="button">${running ? 'Stop' : 'Start'}</button>
      <div class="tally-subtext">${running ? `Started ${escapeHtml(formatTime(running.started_at))}` : 'Total tracked time'}</div>
    `;
    card.querySelector('.duration-action').addEventListener('click', () => (
      running ? stopDurationTally(running.id) : startDurationTally(tally.id)
    ));
  }

  const editButton = card.querySelector('.edit-tally');
  if (editButton) editButton.addEventListener('click', () => openTallyBuilder(tally));

  const deleteButton = card.querySelector('.delete-tally');
  if (deleteButton) deleteButton.addEventListener('click', () => deleteTally(tally));

  return card;
}

async function incrementTally(tallyId) {
  const { error } = await supabase.from('tally_events').insert({
    tally_id: tallyId,
    user_id: currentUser.id,
    event_type: 'increment',
    amount: 1
  });
  if (error) return alert(error.message);
  await Promise.all([loadTallies(), loadDeckTallies(), loadDoubloons()]);
}

async function setToggleTally(tally, on) {
  const today = localDateString(new Date());

  const { data: existing, error: lookupError } = await supabase
    .from('tally_events')
    .select('id')
    .eq('tally_id', tally.id)
    .eq('user_id', currentUser.id)
    .eq('event_type', 'toggle')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999`)
    .maybeSingle();

  if (lookupError) return alert(lookupError.message);

  let error;
  if (existing?.id) {
    ({ error } = await supabase.from('tally_events')
      .update({ amount: on ? 1 : 0, created_at: new Date().toISOString() })
      .eq('id', existing.id));
  } else {
    ({ error } = await supabase.from('tally_events').insert({
      tally_id: tally.id,
      user_id: currentUser.id,
      event_type: 'toggle',
      amount: on ? 1 : 0
    }));
  }

  if (error) return alert(error.message);
  await Promise.all([loadTallies(), loadDeckTallies(), loadDoubloons()]);
}

async function startDurationTally(tallyId) {
  const { error } = await supabase.from('tally_events').insert({
    tally_id: tallyId,
    user_id: currentUser.id,
    event_type: 'duration',
    amount: 0,
    started_at: new Date().toISOString()
  });
  if (error) return alert(error.message);
  await Promise.all([loadTallies(), loadDeckTallies()]);
}

async function stopDurationTally(eventId) {
  const { error } = await supabase.from('tally_events')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', eventId);
  if (error) return alert(error.message);
  await Promise.all([loadTallies(), loadDeckTallies(), loadDoubloons()]);
}

async function deleteTally(tally) {
  if (!confirm(`Delete "${tally.name}" and all of its history?`)) return;
  const { error } = await supabase.from('tallies').delete().eq('id', tally.id);
  if (error) return alert(error.message);
  await Promise.all([loadTallies(), loadDeckTallies()]);
}

function startDurationTicker() {
  if (durationTicker) window.clearInterval(durationTicker);
  durationTicker = window.setInterval(() => {
    document.querySelectorAll('.duration-display, .deck-duration-display').forEach((element) => {
      const base = Number(element.dataset.baseSeconds || 0);
      const startedAt = element.dataset.startedAt;
      const running = startedAt ? Math.max(0, (Date.now() - new Date(startedAt)) / 1000) : 0;
      element.textContent = formatDuration(base + running);
    });
  }, 1000);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatLastEvent(events) {
  const last = [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  return last ? `${formatRelative(last.created_at)}` : 'No activity yet';
}

function formatTime(value) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function localDateString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}


async function handleLogout() {
  setBusy(els.logoutButton, true, 'Leaving…');
  try {
    cleanupRealtime();
    if (durationTicker) window.clearInterval(durationTicker);
    await signOut();
  } catch (error) {
    showMessage(els.profileMessage, error.message, 'error');
  } finally {
    setBusy(els.logoutButton, false, 'Log Out');
  }
}

function openImageViewer(src) {
  els.viewerImage.src = src;
  els.imageViewer.classList.remove('hidden');
  document.body.classList.add('no-scroll');
}

function closeImageViewer() {
  els.imageViewer.classList.add('hidden');
  els.viewerImage.removeAttribute('src');
  document.body.classList.remove('no-scroll');
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

function formatRelative(value) {
  const date = new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

function linkify(value) {
  const escaped = escapeHtml(value).replace(/\n/g, '<br>');
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function escapeAttr(value = '') {
  return escapeHtml(value);
}
