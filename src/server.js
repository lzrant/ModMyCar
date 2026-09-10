/*
 * Part B: Node.js Server
 * A basic Express.js server to interact with the Supabase database.
 */
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from a .env file
dotenv.config();

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware Setup ---
// Enable Cross-Origin Resource Sharing (CORS) for all origins
app.use(cors());
// Enable parsing of JSON request bodies
app.use(express.json());


// --- Supabase Client Initialization ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Ensure Supabase credentials are provided
if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Supabase URL or Key is missing.");
    console.error("Please create a .env file and add SUPABASE_URL and SUPABASE_ANON_KEY.");
    process.exit(1); // Exit if credentials are not set
}

// Create a single, reusable Supabase client instance
const supabase = createClient(supabaseUrl, supabaseKey);


// --- API Endpoints ---

/**
 * GET /api/parts/:type
 * Retrieves all parts that match a specified type from the database.
 * The part type is passed as a URL parameter.
 */
app.get('/api/parts/:type', async (req, res) => {
    const { type } = req.params;

    if (!type) {
        return res.status(400).json({ error: 'A part type must be provided.' });
    }

    try {
        // Query the 'parts' table in Supabase
        const { data, error } = await supabase
            .from('parts')
            .select('*')
            .eq('type', type); // Filter results where 'type' column matches the param

        // If Supabase returns an error, throw it to be caught by the catch block
        if (error) {
            throw error;
        }

        // Send the retrieved data back to the client
        res.status(200).json(data);

    } catch (error) {
        console.error('Error fetching parts:', error.message);
        res.status(500).json({ error: 'Failed to fetch parts from the database.', details: error.message });
    }
});


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

/*
--- Setup and Run Instructions ---

1.  **Install Dependencies:**
    npm install express cors @supabase/supabase-js dotenv

2.  **Create .env file:**
    In the root directory of your project, create a file named `.env`
    and add your Supabase project URL and anon key:

    SUPABASE_URL=https://your-project-ref.supabase.co
    SUPABASE_ANON_KEY=your-public-anon-key

3.  **Enable ES Modules:**
    Add the following line to your `package.json` to use `import` syntax:
    "type": "module"

4.  **Run the Server:**
    node server.js
*/
