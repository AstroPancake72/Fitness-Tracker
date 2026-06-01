//download all exercises once and save to a local JSON file, to avoid hitting API limits during development
const axios = require("axios");
const fs = require("fs");

async function downloadExercises() {
  try {
    const allExercises = [];

    for (let offset = 0; offset < 2000; offset += 10) {
      console.log(`Fetching offset ${offset}...`);

      const response = await axios.get(
        `https://exercisedb.p.rapidapi.com/exercises?limit=10&offset=${offset}`,
        {
          headers: {
            "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            "x-rapidapi-host": "exercisedb.p.rapidapi.com"
          }
        }
      );

      if (!response.data || response.data.length === 0) {
        break;
      }

      allExercises.push(...response.data);

      if (response.data.length < 10) {
        break;
      }
    }

    fs.writeFileSync(
      "./exerciseData.json",
      JSON.stringify(allExercises, null, 2)
    );

    console.log(`Saved ${allExercises.length} exercises.`);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

downloadExercises();