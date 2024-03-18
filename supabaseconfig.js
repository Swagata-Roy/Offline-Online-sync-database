// Import the Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client with project URL and API key
/*const supabaseUrl = 'https://ghwxqwvwklxmbptnairo.supabase.co'; // Replace with your Supabase project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdod3hxd3Z3a2x4bWJwdG5haXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0MjE3MTQsImV4cCI6MjAyMDk5NzcxNH0.jHRSOPceH5hf3aWYu_DRpSvbAtXE1b4yL_63BF4rXeI'; // Replace with your Supabase API key
const supabase = createClient(supabaseUrl, supabaseKey);*/

const supabase = createClient('https://ghwxqwvwklxmbptnairo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdod3hxd3Z3a2x4bWJwdG5haXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU0MjE3MTQsImV4cCI6MjAyMDk5NzcxNH0.jHRSOPceH5hf3aWYu_DRpSvbAtXE1b4yL_63BF4rXeI', {
    global: { fetch: fetch.bind(globalThis) }
})

window.supabase = supabase;

// Function to synchronize data with Supabase
window.syncWithSupabase = async function (entriesData) {
    try {
        // Check if the user is online
        const isOnline = navigator.onLine;

        if (!isOnline) {
            console.log('Currently offline. Changes will be synced when online.');
            return;
        }

        const syncData = async () => {
            try {
                const newEntries = entriesData.filter((entry) => entry._status === 'created');
                const updatedEntries = entriesData.filter((entry) => entry._status === 'updated');
                const deletedEntries = entriesData.filter((entry) => entry._status === 'deleted');

                console.log('New entries:', newEntries);
                console.log('Updated entries:', updatedEntries);
                console.log('Deleted entries:', deletedEntries);

                // Insert new entries and update existing entries
                if (newEntries.length > 0 || updatedEntries.length > 0) {
                    const upsertData = [...newEntries, ...updatedEntries];
                    console.log('Upsert data:', upsertData);

                    // Remove _status column before inserting/updating
                    const sanitizedUpsertData = upsertData.map(({ _status, ...rest }) => rest);

                    const { data: upsertResult, error: upsertError } = await supabase
                        .from('employees')
                        .upsert(sanitizedUpsertData, { onConflict: ['id'] })
                        .select();

                    if (upsertError) {
                        console.error('Error upserting data into Supabase:', upsertError.message);
                        throw upsertError; // Propagate the error to trigger retry
                    } else {
                        console.log('Upserted data into Supabase:', upsertResult);
                    }
                }

                // Update entries
                if (updatedEntries.length > 0) {
                    for (const entry of updatedEntries) {
                        console.log('Updating entry:', entry);

                        // Exclude the '_status' property before updating
                        const { data: updateResult, error: updateError } = await supabase
                            .from('employees')
                            .update(
                                {
                                    name: entry.name,
                                    id: entry.id,
                                    age: entry.age,
                                    post: entry.post,
                                    salary: entry.salary,
                                },
                                { returning: 'minimal' }
                            )
                            .eq('id', entry.id)
                            .select();

                        console.log('Update result:', updateResult);
                        console.log('Update error:', updateError);

                        if (updateError) {
                            console.error('Error updating entry in Supabase:', updateError.message);
                            throw updateError; // Propagate the error to trigger retry
                        }
                    }
                }

                // Delete entries
                if (deletedEntries.length > 0) {
                    for (const entry of deletedEntries) {
                        console.log('Deleting entry:', entry);

                        const { error: deleteError } = await supabase
                            .from('employees')
                            .delete()
                            .eq('id', entry.id);

                        console.log('Delete error:', deleteError);

                        if (deleteError) {
                            console.error('Error deleting entry from Supabase:', deleteError.message);
                            throw deleteError; // Propagate the error to trigger retry
                        }
                    }

                    // Wait for a short time to allow delete operations to complete
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                console.log('Sync successful.');
            } catch (error) {
                console.error('Error syncing with Supabase:', error.message);
                throw error; // Propagate the error to trigger retry
            }
        };

        // Retry synchronization with exponential backoff
        const maxRetries = 5;
        let retries = 0;
        let delay = 1000; // Initial delay in milliseconds

        while (retries < maxRetries) {
            try {
                await syncData();
                console.log('Sync successful.');
                break; // Exit the loop if synchronization is successful
            } catch (error) {
                console.warn(`Sync failed. Retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                retries++;
            }
        }

        if (retries === maxRetries) {
            console.error('Max retries reached. Sync failed.');
        }
    } catch (error) {
        console.error('Error checking online status:', error.message);
    }
}
