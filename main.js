let entries = [];

// Function to save employee data to local storage
async function saveEmployee() {
  const entryNo = document.getElementById('entryNo').value;
  const name = document.getElementById('name').value;
  const id = document.getElementById('id').value;
  const age = document.getElementById('age').value;
  const post = document.getElementById('post').value;
  const salary = document.getElementById('salary').value;

  // Check if entryNo is present for editing or it's a new entry
  if (entryNo !== '') {
    // Edit existing entry
    await editEmployee(entryNo);
  } else {
    // Save new entry
    const newEntry = {
      name: name,
      id: id,
      age: age,
      post: post,
      salary: salary,
    };

    // Retrieve existing entries from local storage
    let entries = JSON.parse(localStorage.getItem('employees')) || [];

    // Add the new entry to the array with _status set to 'created'
    newEntry._status = 'created';
    entries.push(newEntry);

    // Save the updated array back to local storage
    localStorage.setItem('employees', JSON.stringify(entries));

    // Log entries for debugging
    console.log('Entries after save:', entries);

    // Clear the form fields
    clearForm();

    // Refresh the table
    displayEmployees();

    // Call syncWithSupabase with entries
    await syncWithSupabase(entries);
  }
}

// Function to edit employee data in local storage
async function editEmployee(entryNo) {
  const name = document.getElementById('name').value;
  const id = document.getElementById('id').value;
  const age = document.getElementById('age').value;
  const post = document.getElementById('post').value;
  const salary = document.getElementById('salary').value;

  // Check if entryNo is present for editing
  if (entryNo !== '') {
    // Retrieve existing entries from local storage
    const entries = JSON.parse(localStorage.getItem('employees')) || [];

    // Find the entry to edit
    const entryToEdit = entries[entryNo];

    // Check if the entry is found
    if (entryToEdit) {
      // Update the entry's data
      entryToEdit.name = name;
      entryToEdit.id = id;
      entryToEdit.age = age;
      entryToEdit.post = post;
      entryToEdit.salary = salary;

      // Set _status to 'updated' for the edited entry
      entryToEdit._status = 'updated';

      // Save the updated array back to local storage
      localStorage.setItem('employees', JSON.stringify(entries));

      // Clear the form fields
      clearForm();

      // Refresh the table
      displayEmployees();

      // Call syncWithSupabase with entries
      await syncWithSupabase(entries);

    } else {
      console.error('Entry not found for editing.');
    }
  } else {
    console.error('EntryNo is missing for editing.');
  }
}

// Function to delete employee data from local storage
async function deleteEmployee(entryNo) {
  // Retrieve existing entries from local storage
  let entries = JSON.parse(localStorage.getItem('employees')) || [];

  // Convert entryNo to an integer
  const entryIndex = parseInt(entryNo, 10);

  // Check if the entry is found
  if (!isNaN(entryIndex) && entryIndex >= 0 && entryIndex < entries.length) {
    const deletedEntry = entries[entryIndex];

    // Check if the entry is marked as 'created' or 'updated'
    if (deletedEntry._status === 'created' || deletedEntry._status === 'updated') {
      // Remove the entry from the array
      entries.splice(entryIndex, 1);

      // Save the updated array back to local storage
      localStorage.setItem('employees', JSON.stringify(entries));

      // Log entries for debugging
      console.log('Entries after delete:', entries);

      // Refresh the table
      displayEmployees();

      // Call syncWithSupabase with entries
      await syncWithSupabase(entries);
    } else if (deletedEntry._status === 'deleted') {
      // Entry already marked as deleted in local storage
      console.warn('Entry already marked as deleted in local storage.');
    } else {
      console.error('Invalid status for deletion in local storage:', deletedEntry._status);
    }

    // Check if the entry has an 'id' (indicating it was synced with Supabase)
    if (deletedEntry.id) {
      // Delete entry from Supabase
      const { data, error } = await supabase
          .from('employees')
          .delete()
          .eq('id', deletedEntry.id);

      if (error) {
        console.error('Error deleting entry from Supabase:', error.message);
      } else {
        console.log('Deleted entry from Supabase:', data);
      }
    } else {
      console.warn('Entry does not have an "id" and may not be synced with Supabase.');
    }
  } else {
    console.error('Entry not found for deletion.');
  }
}


// Function to clear the form fields
function clearForm() {
  document.getElementById('entryNo').value = '';
  document.getElementById('name').value = '';
  document.getElementById('id').value = '';
  document.getElementById('age').value = '';
  document.getElementById('post').value = '';
  document.getElementById('salary').value = '';
}

// Function to display employees in the table
function displayEmployees() {
  // Retrieve existing entries from local storage
  const entries = JSON.parse(localStorage.getItem('employees')) || [];

  // Get the table body element
  const tableBody = document.querySelector('#employeeTable tbody');

  // Clear the table body
  tableBody.innerHTML = '';

  // Populate the table with entries
  entries.forEach((entry, index) => {
    const row = tableBody.insertRow();

    // Add data cells
    const cells = [
      index + 1,
      entry.name,
      entry.id,
      entry.age,
      entry.post,
      entry.salary,
      `<button class="edit" onclick="editEntry(${index})">Edit</button> <button class="delete" onclick="deleteEmployee(${index})">Delete</button>`
    ];

    cells.forEach((cell, cellIndex) => {
      const cellElement = row.insertCell(cellIndex);
      cellElement.innerHTML = cell;
    });
  });
}

// Function to populate the form fields for editing
function editEntry(index) {
  const entries = JSON.parse(localStorage.getItem('employees')) || [];
  const entryToEdit = entries[index];

  // Check if the index is valid
  if (entryToEdit) {
    // Populate the form fields
    document.getElementById('entryNo').value = index;
    document.getElementById('name').value = entryToEdit.name;
    document.getElementById('id').value = entryToEdit.id;
    document.getElementById('age').value = entryToEdit.age;
    document.getElementById('post').value = entryToEdit.post;
    document.getElementById('salary').value = entryToEdit.salary;
  } else {
    console.error('Invalid index for editing.');
  }
}

// Initial display of employees when the page loads
displayEmployees();