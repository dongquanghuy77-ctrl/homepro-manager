const req = await fetch('http://localhost:3000/api/pwr/contacts', {
  method: 'GET'
});
console.log(req.status, await req.text());
