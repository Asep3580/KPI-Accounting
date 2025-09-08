document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = loginForm.username.value;
            const password = loginForm.password.value;

            try {
                const response = await fetch('https://kpi-accounting.onrender.com/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Login gagal.');
                }

                // Simpan token ke localStorage
                localStorage.setItem('authToken', data.token);
                window.location.href = 'index.html';
            } catch (error) {
                alert(error.message);
            }
        });
    }

});
