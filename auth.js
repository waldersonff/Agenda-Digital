import { auth } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Login
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                errorMessage.textContent = 'Erro no login: ' + error.message;
                errorMessage.style.display = 'block';
            });
    });
}

// Register (for register.html)
if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alert('Senhas não coincidem');
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                return updateProfile(userCredential.user, {
                    displayName: username
                });
            })
            .then(() => {
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                alert('Erro no registro: ' + error.message);
            });
    });
}
