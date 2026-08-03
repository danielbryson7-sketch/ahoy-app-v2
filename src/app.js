import { supabase } from './supabase.js';
import { signIn, signUp, signOut, getSession, onAuthStateChange } from './auth.js';

let authMode = 'login';
let currentUser = null;
let currentProfile = null;
let selectedPostImage = null;
let selectedNoteImage = null;
let showCompletedNotes = false;
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
    'deckView','notesView','profileView','deckNavButton','notesNavButton','profileNavButton','deckBrandButton',
    'doubloonCount','composerAvatar','postBodyInput','postImageInput',
    'postImagePreviewWrap','postImagePreview','removePostImageButton',
    'createPostButton','postMessage','feedStatus','postFeed',
    'imageViewer','viewerImage','closeImageViewer',
    'toggleCompletedNotesButton','noteBodyInput','noteDateInput','noteVisibilityInput',
    'openNotesFromDeckButton','deckNotesStatus','deckNotesList',
    'noteEarlyDaysInput','noteSharedUsersWrap','noteSharedUsersInput','noteImageInput',
    'noteImagePreviewWrap','noteImagePreview','removeNoteImageButton','createNoteButton',
    'noteMessage','notesStatus','notesList'
  ].forEach((id) => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.loginTab.addEventListener('click', () => setAuthMode('login'));
  els.signupTab.addEventListener('click', () => setAuthMode('signup'));
  els.authForm.addEventListener('submit', handleAuthSubmit);
  els.logoutButton.addEventListener('click', handleLogout);
  els.saveProfileButton.addEventListener('click', saveProfile);
  els.avatarInput.addEventListener('change', uploadAvatar);
  els.deckNavButton.addEventListener('click', () => showView('deck'));
  els.deckBrandButton.addEventListener('click', () => showView('deck'));
  els.notesNavButton.addEventListener('click', () => showView('notes'));
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
    showAppPage();
    showView('deck');
    await Promise.all([loadDoubloons(), loadFeed(), loadDeckNotes()]);
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
  const profile = view === 'profile';

  els.deckView.classList.toggle('hidden', !deck);
  els.notesView.classList.toggle('hidden', !notes);
  els.profileView.classList.toggle('hidden', !profile);

  els.deckNavButton.classList.toggle('active', deck);
  els.notesNavButton.classList.toggle('active', notes);
  els.profileNavButton.classList.toggle('active', profile);

  if (deck) {
    loadFeed();
    loadDeckNotes();
  }
  if (notes) loadNotes();
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
  els.composerAvatar.textContent = name.substring(0, 1).toUpperCase();
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
  const [posts, comments, received] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', currentUser.id),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('author_id', currentUser.id),
    supabase.from('post_reactions')
      .select('post_id, posts!inner(author_id)', { count: 'exact' })
      .eq('reaction', 'like')
      .eq('posts.author_id', currentUser.id)
  ]);
  const total = (posts.count || 0) * 5 + (comments.count || 0) * 2 + (received.count || 0);
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


async function handleLogout() {
  setBusy(els.logoutButton, true, 'Leaving…');
  try {
    cleanupRealtime();
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
