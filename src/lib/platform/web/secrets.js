const SESSION_KEY = 'cajita.github.token.session';
const LOCAL_KEY = 'cajita.github.token.remembered';

function sessionStore() {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

function localStore() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export async function getGithubToken() {
  return (await getGithubTokenInfo()).token;
}

export async function getGithubTokenInfo() {
  const remembered = localStore()?.getItem(LOCAL_KEY);
  const session = sessionStore()?.getItem(SESSION_KEY);
  return { token: session ?? remembered ?? null, remembered: Boolean(remembered) };
}

export async function setGithubToken(token, { remember = false } = {}) {
  sessionStore()?.removeItem(SESSION_KEY);
  localStore()?.removeItem(LOCAL_KEY);
  if (!token) return;
  if (remember) localStore()?.setItem(LOCAL_KEY, token);
  else sessionStore()?.setItem(SESSION_KEY, token);
}

export async function clearGithubToken() {
  sessionStore()?.removeItem(SESSION_KEY);
  localStore()?.removeItem(LOCAL_KEY);
}
