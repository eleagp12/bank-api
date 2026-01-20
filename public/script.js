'use strict';

/* =========================
   GLOBAL STATES 
========================= */
let currentAccount = null;
let currentUserRole = null;

/* =========================
   DOM ELEMENTS
========================= */
const labelWelcome = document.querySelector('.welcome');
const labelBalance = document.querySelector('.balance__value');
const labelTimer = document.querySelector('.timer');
const labelSumIn = document.querySelector('.summary__value--in');
const labelSumOut = document.querySelector('.summary__value--out');
const labelInterest = document.querySelector('.summary__value--interest');

const containerApp = document.querySelector('.app');
const containerMovements = document.querySelector('.movements');

const loginForm = document.querySelector('.login');
const registerForm = document.querySelector('.register');

const btnLogin = document.querySelector('.login__btn');
const btnLogout = document.querySelector('.btn--logout');
const btnShowRegister = document.querySelector('.btn--show-register');
const btnBackLogin = document.querySelector('.btn--back-login');
const btnRegister = document.querySelector('.register__btn');
const btnTransfer = document.querySelector('.form__btn--transfer');
const btnLoan = document.querySelector('.form__btn--loan');
const btnClose = document.querySelector('.form__btn--close');

const inputLoginUser = document.querySelector('.login__input--user');
const inputLoginPass = document.querySelector('.login__input--pin');
const inputTransferTo = document.querySelector('.form__input--to');
const inputTransferAmount = document.querySelector('.form__input--amount');
const inputLoanAmount = document.querySelector('.form__input--loan-amount');
const inputCloseUser = document.querySelector('.form__input--user');
const inputClosePin = document.querySelector('.form__input--pin');

const inputRegName = document.querySelector('.register__input--name');
const inputRegLast = document.querySelector('.register__input--lastname');
const inputRegUser = document.querySelector('.register__input--username');
const inputRegEmail = document.querySelector('.register__input--email');
const inputRegPass = document.querySelector('.register__input--password');
const inputRegConfirm = document.querySelector('.register__input--confirm');

/* =========================
   GLOBAL STATE
========================= */
let logoutTimer;

/* =========================
   API HELPERS
========================= */
async function apiLogin(username, password) {
  const res = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: username.trim(),
      pin: password.trim(),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }

  return res.json();
}

async function apiRegister(data) {
  const res = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }

  return res.json();
}

async function loadAccount(userId) {
  const res = await fetch(`http://localhost:3000/accounts/user/${userId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!res.ok) throw new Error('Failed to load account');

  const account = await res.json();

  currentAccount = {
    userId,
    id: account.id,
    interestRate: Number(account.interestRate),
    movements: account.movements || [],
  };

  containerMovements.innerHTML = '';
  let balance = 0;

  currentAccount.movements.forEach(tx => {
    balance += Number(tx.amount);

    const type = tx.amount > 0 ? 'deposit' : 'withdrawal';

    const html = `
      <div class="movements__row">
        <div class="movements__type movements__type--${type}">
          ${tx.type}
        </div>
        <div class="movements__value">
          ${Number(tx.amount).toFixed(2)}$
        </div>
      </div>
    `;
    containerMovements.insertAdjacentHTML('afterbegin', html);
  });

  labelBalance.textContent = `${balance.toFixed(2)}$`;

  // Admin-only UI
  document.querySelector('.operation--close').style.display =
    currentUserRole === 'admin' ? 'block' : 'none';

  calcDisplaySummary(currentAccount.movements, currentAccount.interestRate);
}

/* =========================
   LOGOUT TIMER
========================= */
function startLogoutTimer() {
  let time = 300;

  const tick = () => {
    const min = String(Math.trunc(time / 60)).padStart(2, '0');
    const sec = String(time % 60).padStart(2, '0');
    labelTimer.textContent = `${min}:${sec}`;

    if (time === 0) {
      clearInterval(logoutTimer);
      logout();
      alert('Session expired');
    }
    time--;
  };

  clearInterval(logoutTimer);
  tick();
  logoutTimer = setInterval(tick, 1000);
}

function resetLogoutTimer() {
  clearInterval(logoutTimer);
  startLogoutTimer();
}

function logout() {
  localStorage.removeItem('token');
  containerApp.style.opacity = 0;
  labelWelcome.textContent = 'Log in to get started';
  btnLogout.classList.add('hidden');
  btnShowRegister.classList.remove('hidden');
  btnBackLogin.classList.add('hidden');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
}

/* =========================
   EVENTS
========================= */

// 🔐 LOGIN
btnLogin.addEventListener('click', async e => {
  e.preventDefault();

  try {
    const data = await apiLogin(inputLoginUser.value, inputLoginPass.value);

    localStorage.setItem('token', data.token);
    currentUserRole = data.role;

    labelWelcome.textContent = `Welcome back`;
    containerApp.style.opacity = 1;

    loginForm.classList.add('hidden');
    btnLogout.classList.remove('hidden');

    btnShowRegister.classList.add('hidden');
    btnBackLogin.classList.add('hidden');
    registerForm.classList.add('hidden');

    await loadAccount(data.userId);
    startLogoutTimer();
  } catch (err) {
    alert(err.message);
  }

  inputLoginUser.value = '';
  inputLoginPass.value = '';
});

// 🔓 LOGOUT
btnLogout.addEventListener('click', logout);

// 📝 SHOW REGISTER
btnShowRegister.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');

  btnShowRegister.classList.add('hidden');
  btnBackLogin.classList.remove('hidden');
});

// 🔙 BACK TO LOGIN
btnBackLogin.addEventListener('click', () => {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');

  btnShowRegister.classList.remove('hidden');
  btnBackLogin.classList.add('hidden');
});

// 🆕 REGISTER
btnRegister.addEventListener('click', async e => {
  e.preventDefault();

  const data = {
    name: inputRegName.value,
    lastName: inputRegLast.value,
    username: inputRegUser.value,
    email: inputRegEmail.value,
    password: inputRegPass.value,
    confirmPassword: inputRegConfirm.value,
  };

  try {
    await apiRegister(data);
    alert('Account created successfully');

    registerForm.reset();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    inputLoginUser.value = data.username;
  } catch (err) {
    alert(err.message);
  }
});

// TRANSFER MONEY
btnTransfer.addEventListener('click', async e => {
  e.preventDefault();

  const amount = Number(inputTransferAmount.value);
  const receiver = inputTransferTo.value.trim();

  try {
    const res = await fetch(
      `http://localhost:3000/accounts/${currentAccount.id}/transfer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ toUsername: receiver, amount }),
      },
    );

    const data = await res.json();
    if (!res.ok) return alert(data.error);

    alert('Transfer successful');
    inputTransferAmount.value = '';
    inputTransferTo.value = '';
    await loadAccount(currentAccount.userId);
    resetLogoutTimer();
  } catch {
    alert('Network error');
  }
});

// LOAN HANDLER
btnLoan.addEventListener('click', async e => {
  e.preventDefault();

  const amount = Number(inputLoanAmount.value);

  try {
    const res = await fetch(
      `http://localhost:3000/accounts/${currentAccount.id}/loan`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ amount }),
      },
    );

    const data = await res.json();
    if (!res.ok) return alert(data.error);

    alert('Loan approved');
    inputLoanAmount.value = '';
    await loadAccount(currentAccount.userId);
    resetLogoutTimer();
  } catch {
    alert('Network error');
  }
});

// CLOSE ACCOUNT
btnClose.addEventListener('click', async e => {
  e.preventDefault();

  const targetUsername = inputCloseUser.value.trim();
  const adminPin = inputClosePin.value.trim();

  if (!targetUsername || !adminPin) return alert('Missing data');

  try {
    const res = await fetch('http://localhost:3000/accounts/by-username', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ targetUsername, adminPin }),
    });

    if (!res.ok) throw new Error();

    alert(`User ${targetUsername} deleted`);
    resetLogoutTimer();
  } catch {
    alert('Delete failed');
  }

  inputCloseUser.value = inputClosePin.value = '';
});

function calcDisplaySummary(movements, interestRate) {
  const incomes = movements
    .map(tx => Number(tx.amount))
    .filter(a => a > 0)
    .reduce((sum, a) => sum + a, 0);

  labelSumIn.textContent = `${incomes.toFixed(2)}$`;

  const outcomes = movements
    .map(tx => Number(tx.amount))
    .filter(a => a < 0)
    .reduce((sum, a) => sum + a, 0);

  labelSumOut.textContent = `${Math.abs(outcomes).toFixed(2)}$`;

  const interest = movements
    .map(tx => Number(tx.amount))
    .filter(a => a > 0)
    .map(dep => (dep * interestRate) / 100)
    .filter(i => i >= 0)
    .reduce((sum, i) => sum + i, 0);

  labelInterest.textContent = `${interest.toFixed(2)}$`;
}
