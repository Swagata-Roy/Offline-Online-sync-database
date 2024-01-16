// Import the Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client with project URL and API key
const supabaseUrl = 'Supabase project URL';
const supabaseKey = 'Supabase API key';
const supabase = createClient(supabaseUrl, supabaseKey);

window.supabase = supabase;

// Function to synchronize data with Supabase
window.syncWithSupabase = async function (entriesData) {
    try {
        // Check if the user is online
        const isOnline = navigator.onLine;

        if (isOnline) {
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
                }
            }
        } else {
            console.log('Currently offline. Changes will be synced when online.');
        }
    } catch (error) {
        console.error('Error syncing with Supabase:', error.message);
    }
}
