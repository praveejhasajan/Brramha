const form = document.querySelector('form');
const resultsDiv = document.querySelector('#results');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = form.elements['name'].value;
  const email = form.elements['email'].value;
  const type = form.elements['type'].value;

  const newUser = {
    name,
    email,
    type
  };

  fetch('/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newUser)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    const successMsg = document.createElement('p');
    successMsg.textContent = `New user ${data.name} created successfully!`;
    resultsDiv.appendChild(successMsg);
  })
  .catch(error => {
    const errorMsg = document.createElement('p');
    errorMsg.textContent = error.message;
    errorMsg.classList.add('error');
    resultsDiv.appendChild(errorMsg);
  });
});
