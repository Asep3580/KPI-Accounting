document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    // Gunakan variabel yang sama seperti di script.js untuk konsistensi
    // Ganti URL ini jika backend Anda memiliki alamat yang berbeda.
    const API_BASE_URL = 'https://kpi-accounting.backend.onrender.com/api';

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = loginForm.username.value;
            const password = loginForm.password.value;

            try {
                // Gunakan variabel API_BASE_URL
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
                // Menangkap error jaringan seperti 'Failed to fetch'
                if (error instanceof TypeError && error.message === 'Failed to fetch') {
                   alert('Gagal terhubung ke server. Pastikan backend berjalan dan URL API benar.');
                } else {
                   alert(error.message);
                }
            }
        });
    }
});
