# Fitness-Tracker
(description goes here)

![Fitness-Tracker](docs/sampleimage.jpg)

## Authors

* Forrest Allen (flallen06@ucla.edu)
* Riya Patil (rpatil1@ucla.edu)
* Owen Rusk (owenrusk@ucla.edu)
* Ashley Torres (at4633112@ucla.edu)
* Johnny Zhang (jzhang566@ucla.edu)

## Features

## Installation

### Dependencies

* [Node.js](https://nodejs.org/en/download) version 26.1 or later
* [MongoDB Server](https://www.mongodb.com/) (local or Atlas)

## Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/AstroPancake72/Fitness-Tracker.git
    ```

2. Enter the project directory:
    ```bash
    cd Fitness-Tracker
    ```

### Backend

3. Enter the backend directory:
    ```bash
    cd backend
    ```

4. Create a `.env` file in the `backend` folder (see .env.example) with the following variables:

    ```env
    MONGO_URI=your_mongodb_connection_string
    EMAIL_USER=your_email_address
    EMAIL_PASS=your_email_app_specific_password
    SESSION_SECRET=your_random_secret_session_id
    RAPIDAPI_KEY=your_rapidapi_api_key
    SPOONACULAR_API_KEY=your_spoonacular_api_key
    ```

5. Install node.js dependencies:
    ```bash
    npm install
    ```

6. Start the backend server:
    ```bash
    npm start
    ```

### Frontend

6. Create another terminal in the project directory

7. Enter the frontend directory:
    ```bash
    cd frontend
    ```

8. Install node.js dependencies:
    ```bash
    npm install
    ```

9. Start the frontend server:
    ```bash
    npm run dev
    ```

10. Open your browser to the provided Vite URL
