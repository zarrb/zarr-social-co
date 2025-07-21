// login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('errorMessage');

    // Check if the user is already logged in. If so, redirect to the dashboard.
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        window.location.href = 'index.html'; // Redirect to the main dashboard
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the form from reloading the page
        errorMessageDiv.style.display = 'none'; // Hide any previous error messages

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch('http://localhost:5001/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // If response is not 2xx, throw an error with the message from the backend
                throw new Error(data.message || 'An unknown error occurred');
            }

            // --- Login Successful ---
            console.log('Login successful:', data);

            // Store the user info and token in localStorage
            // localStorage is a browser feature for storing simple key-value pairs
            localStorage.setItem('userInfo', JSON.stringify(data));

            // Redirect to the main dashboard page
            window.location.href = 'index.html';

        } catch (error) {
            // --- Login Failed ---
            console.error('Login failed:', error);
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.style.display = 'block';
        }
    });
});
