let syncQueue = [];

const MAX_RETRIES = 3;

// Save queue
async function saveSyncQueue() {
  localStorage.setItem('syncQueue', JSON.stringify(syncQueue));
}

async function processSyncQueue() {

  if(navigator.onLine) {

    const queue = JSON.parse(localStorage.getItem('syncQueue')) || [];

    for(let action of queue) {

      try {

        if (action.action === 'insert') {
          await supabase.from(action.table).insert(action.data);
        }

      } catch(error) {

        if(action.retryCount >= MAX_RETRIES) {
          syncQueue = syncQueue.filter(a => a !== action);

        } else {
          action.retryCount = action.retryCount + 1 || 1;
          syncQueue.unshift(action);
        }

      }

    }

    await saveSyncQueue();

  }

}

async function saveEmployee() {

  const entryNo = document.getElementById('entryNo').value;
  const name = document.getElementById('name').value;
  const id = document.getElementById('id').value;
  const age = document.getElementById('age').value;
  const post = document.getElementById('post').value;
  const salary = document.getElementById('salary').value;

  if (entryNo !== '') {
    await editEmployee(entryNo);
  } else {

    let entries = JSON.parse(localStorage.getItem('employees')) || [];

    const newEntry = {
      name,
      id,
      age,
      post,
      salary
    };

    newEntry._status = 'created';
    entries.push(newEntry);

    localStorage.setItem('employees', JSON.stringify(entries));

    // Clear the form fields
    clearForm();

    // Refresh the table
    displayEmployees();

    if(navigator.onLine) {
      await syncWithSupabase(entries);
    } else {
      syncQueue.push({
        action: 'insert',
        table: 'employees',
        data: entries
      });

      await saveSyncQueue();
    }

  }

}

async function editEmployee(entryNo) {

  const name = document.getElementById('name').value;
  const id = document.getElementById('id').value;
  const age = document.getElementById('age').value;
  const post = document.getElementById('post').value;
  const salary = document.getElementById('salary').value;

  if (entryNo !== '') {

    const entries = JSON.parse(localStorage.getItem('employees')) || [];

    const entryToEdit = entries[entryNo];

    if (entryToEdit) {
      entryToEdit.name = name;
      entryToEdit.id = id;
      entryToEdit.age = age;
      entryToEdit.post = post;
      entryToEdit.salary = salary;

      entryToEdit._status = 'updated';

      localStorage.setItem('employees', JSON.stringify(entries));

      clearForm();

      displayEmployees();

      await syncWithSupabase(entries);

    } else {
      console.error('Entry not found for editing.');
    }

  } else {
    console.error('EntryNo is missing for editing.');
  }

}


async function deleteEmployee(entryNo) {
  let entries = JSON.parse(localStorage.getItem('employees')) || [];

  const entryIndex = parseInt(entryNo, 10);

  if (!isNaN(entryIndex) && entryIndex >= 0 && entryIndex < entries.length) {
    const deletedEntry = entries[entryIndex];

    if (deletedEntry._status === 'created' || deletedEntry._status === 'updated') {
      entries.splice(entryIndex, 1);

      localStorage.setItem('employees', JSON.stringify(entries));

      console.log('Entries after delete:', entries);

      displayEmployees();

      if (deletedEntry.id) {
        const maxRetries = 5;
        let retries = 0;
        let delay = 1000; // Initial delay in milliseconds

        while (retries < maxRetries) {
          try {
            const { error } = await supabase
                .from('employees')
                .delete()
                .eq('id', deletedEntry.id);

            if (error) {
              console.error('Error deleting entry from Supabase:', error.message);
              throw error; // Propagate the error to trigger retry
            } else {
              console.log('Deleted entry from Supabase successfully.');
              break; // Exit the loop if deletion is successful
            }
          } catch (error) {
            console.warn(`Error deleting entry. Retrying in ${delay / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            retries++;
          }
        }

        if (retries === maxRetries) {
          console.error('Max retries reached. Delete failed.');
        }
      } else {
        console.warn('Entry does not have an "id" and may not be synced with Supabase.');
      }
    } else if (deletedEntry._status === 'deleted') {
      console.warn('Entry already marked as deleted in local storage.');
    } else {
      console.error('Invalid status for deletion in local storage:', deletedEntry._status);
    }
  } else {
    console.error('Entry not found for deletion.');
  }
}

function clearForm() {

  document.getElementById('entryNo').value = '';
  document.getElementById('name').value = '';
  document.getElementById('id').value = '';
  document.getElementById('age').value = '';
  document.getElementById('post').value = '';
  document.getElementById('salary').value = '';

}


function displayEmployees() {

  const entries = JSON.parse(localStorage.getItem('employees')) || [];

  const tableBody = document.querySelector('#employeeTable tbody');

  tableBody.innerHTML = '';

  entries.forEach((entry, index) => {

    const row = tableBody.insertRow();

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


function editEntry(index) {
  const entries = JSON.parse(localStorage.getItem('employees')) || [];
  const entryToEdit = entries[index];

  if (entryToEdit) {
    document.getElementById('entryNo').value = index;
    document.getElementById('name').value = entryToEdit.name;
    document.getElementById('id').value = entryToEdit.id;
    document.getElementById('age').value = entryToEdit.age;
    document.getElementById('post').value = entryToEdit.post;
    document.getElementById('salary').value = entryToEdit.salary;

    // Open the modal
    openModal('employeeFormModal');
  } else {
    console.error('Invalid index for editing.');
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = "flex";
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = "none";
  clearForm();
}

// Event listener for online events
window.addEventListener('online', () => {
  console.log('Online event detected. Syncing data...');
  processSyncQueue();
});

// Event listener for offline events
window.addEventListener('offline', () => {
  console.log('Offline event detected. Data sync will resume when online.');
});

// Initially load and process queue
processSyncQueue();

// Initial display
displayEmployees();