/* Independent of React, Supabase, cookies and protected HTML. */
(function () {
  const store = globalThis.DevArenaOffline,
    library = document.getElementById('library');
  const reader = document.getElementById('reader'),
    message = document.getElementById('message');
  function status() {
    document.getElementById('connection').textContent = navigator.onLine
      ? 'Connection detected. Return online to sign in and check downloaded versions.'
      : 'Offline. Reading downloaded copies only.';
  }
  function button(text, action) {
    const node = document.createElement('button');
    node.textContent = text;
    node.onclick = action;
    return node;
  }
  async function load() {
    reader.hidden = true;
    library.hidden = false;
    library.replaceChildren();
    try {
      const copies = await store.list();
      if (!copies.length) {
        const empty = document.createElement('p');
        empty.textContent =
          'No downloaded resources. Sign in online, open a written Knowledge resource and choose “Download for offline reading”.';
        library.append(empty);
        return;
      }
      for (const copy of copies) {
        const card = document.createElement('section');
        card.className = 'resource';
        const title = document.createElement('h2');
        title.textContent = copy.title;
        const date = document.createElement('p');
        date.className = 'muted';
        date.textContent = `Downloaded ${new Date(copy.downloadedAt).toLocaleString()} · ${copy.availability}`;
        if (copy.availability === 'unavailable')
          date.textContent +=
            '. No longer available. Return online to check access and download again.';
        const actions = document.createElement('div');
        actions.className = 'actions';
        if (copy.availability !== 'unavailable')
          actions.append(button('Read copy', () => read(copy)));
        actions.append(
          button('Delete copy', async () => {
            try {
              await store.remove(copy.id);
              await load();
              message.textContent = 'Downloaded copy deleted.';
            } catch {
              message.textContent =
                'Unable to delete this copy. Check browser storage permissions.';
            }
          }),
        );
        card.append(title, date, actions);
        library.append(card);
      }
    } catch {
      message.textContent =
        'Local storage is unavailable. Allow site storage and reopen this page.';
    }
  }
  function read(copy) {
    if (store.owner() !== copy.userId) {
      void load();
      return;
    }
    library.hidden = true;
    reader.hidden = false;
    document.getElementById('title').textContent = copy.title;
    document.getElementById('content').textContent = copy.content;
    document.getElementById('metadata').textContent = [
      ...copy.topics,
      ...copy.skills,
    ]
      .map((item) => item.name)
      .concat(copy.tags || [])
      .join(' · ');
    document.getElementById('attribution').textContent = [
      copy.source,
      copy.attribution,
    ]
      .filter(Boolean)
      .join(' — ');
    document.getElementById('availability').textContent =
      copy.availability === 'stale'
        ? 'A newer version is available. Return online to download it.'
        : `Saved version: ${copy.version}`;
    document.getElementById('back').focus();
  }
  document.getElementById('back').onclick = load;
  window.addEventListener('online', status);
  window.addEventListener('offline', status);
  window.addEventListener('storage', () => {
    document.getElementById('content').textContent = '';
    void load();
  });
  status();
  void load();
})();
