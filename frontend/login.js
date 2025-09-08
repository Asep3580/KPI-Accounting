document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    // Gunakan variabel yang sama seperti di script.js untuk konsistensi
    // PERBAIKAN: Sesuaikan dengan URL backend Anda yang sebenarnya dari log Render.
    const API_BASE_URL = 'https://kpi-accounting.onrender.com/api';

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
                    let errorMessage = `Terjadi kesalahan server (Status: ${response.status})`;
                    // PERBAIKAN: Baca body sebagai teks SEKALI saja, karena kita tidak tahu formatnya.
                    const errorText = await response.text();
                    try {
                        // Coba parse teks tersebut sebagai JSON.
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.message || errorMessage;
                    } catch (parseError) {
                        // Jika gagal di-parse, berarti itu bukan JSON. Gunakan teks aslinya.
                        errorMessage = errorText.substring(0, 150) || errorMessage;
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