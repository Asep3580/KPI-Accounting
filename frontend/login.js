document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    // Gunakan variabel yang sama seperti di script.js untuk konsistensi
    // Ganti URL ini jika backend Anda memiliki alamat yang berbeda.
    const API_BASE_URL = 'https://kpi-accounting-backend.onrender.com/api';

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorMessageDiv = document.getElementById('error-message');
            errorMessageDiv.classList.add('hidden'); // Sembunyikan error lama setiap kali submit

            const username = loginForm.username.value;
            const password = loginForm.password.value;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                if (!response.ok) {
                    // Coba baca error sebagai JSON, jika gagal, baca sebagai teks.
                    let errorMessage = `Terjadi kesalahan server (Status: ${response.status})`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } catch (jsonError) {
                        // Jika respons bukan JSON, itu mungkin halaman error HTML/teks.
                        const errorText = await response.text();
                        // Tampilkan pesan yang lebih informatif jika ada teks error.
                        errorMessage = errorText.substring(0, 150) || errorMessage; // Ambil 150 karakter pertama
                    }
                    throw new Error(errorMessage);
                }

                // Jika respons OK, baru kita parse sebagai JSON.
                const data = await response.json();
                // Simpan token ke localStorage
                localStorage.setItem('authToken', data.token);
                window.location.href = 'index.html';
            } catch (error) {
                errorMessageDiv.querySelector('span').textContent = error.message;
                errorMessageDiv.classList.remove('hidden');
            }
        });
    }
});
