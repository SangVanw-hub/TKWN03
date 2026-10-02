const form = document.getElementById('minerForm');
const fields = {
    fullname: document.getElementById('fullname'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    message: document.getElementById('message')
};
const successAlert = document.getElementById('successAlert');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(03|05|07|08|09)\d{8}$/;

function setError(field, message) {
    field.classList.toggle('error', Boolean(message));
    field.setAttribute('aria-invalid', String(Boolean(message)));
    document.getElementById(`${field.id}Error`).textContent = message;
}

function validateField(field) {
    const value = field.value.trim();
    let error = '';

    if (!value) {
        error = 'Vui lòng điền thông tin này.';
    } else if (field === fields.fullname && value.length < 2) {
        error = 'Tên cần có ít nhất 2 ký tự.';
    } else if (field === fields.email && !emailPattern.test(value)) {
        error = 'Vui lòng nhập địa chỉ email hợp lệ.';
    } else if (field === fields.phone && !phonePattern.test(value)) {
        error = 'Nhập số điện thoại 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
    }

    setError(field, error);
    return !error;
}

Object.values(fields).forEach((field) => {
    field.addEventListener('input', () => {
        if (field.classList.contains('error')) validateField(field);
        successAlert.hidden = true;
    });
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    successAlert.hidden = true;
    const invalidField = Object.values(fields).find((field) => !validateField(field));

    if (invalidField) {
        invalidField.focus();
        return;
    }

    successAlert.hidden = false;
    form.reset();
    Object.values(fields).forEach((field) => setError(field, ''));
});
