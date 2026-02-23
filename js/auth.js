/* ===== DEALCLAW AUTH MODULE ===== */

var DealClawAuth = (function() {
  'use strict';

  var TOKEN_KEY = 'dealclaw_token';
  var USER_KEY = 'dealclaw_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    var raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function saveAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login.html';
  }

  function register(email, password) {
    return fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.ok && data.token) {
        saveAuth(data.token, data.user);
        return { ok: true, user: data.user };
      }
      return { ok: false, error: data.error || 'Registration failed' };
    });
  }

  function login(email, password) {
    return fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.ok && data.token) {
        saveAuth(data.token, data.user);
        return { ok: true, user: data.user };
      }
      return { ok: false, error: data.error || 'Login failed' };
    });
  }

  function validateToken() {
    var token = getToken();
    if (!token) return Promise.resolve(false);

    return fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.ok && data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return true;
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return false;
    })
    .catch(function() { return false; });
  }

  // Require auth — redirect to login if not authenticated
  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  }

  return {
    getToken: getToken,
    getUser: getUser,
    isLoggedIn: isLoggedIn,
    login: login,
    register: register,
    logout: logout,
    validateToken: validateToken,
    requireAuth: requireAuth
  };
})();
