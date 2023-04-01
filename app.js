const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwtwebtoken = require("jsonwebtoken");
const path = require("path");
const app = express();

app.use(express.json());

const database = path.join(__dirname, "covid19IndiaPortal.db");

let DATABASE = null;

let start = async () => {
  try {
    DATABASE = await open({
      filename: database,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`database error ${e.message}`);
  }
};
start();

const snakeCase_to_cameCase_STATE = (databaseObject) => {
  return {
    stateId: databaseObject.state_id,
    stateName: databaseObject.state_name,
    population: databaseObject.population,
  };
};

const snakeCase_to_cameCase_District = (databaseObject) => {
  return {
    districtId: databaseObject.district_id,
    districtName: databaseObject.district_name,
    stateId: databaseObject.state_id,

    cases: databaseObject.cases,
    cured: databaseObject.cured,
    active: databaseObject.active,
    deaths: databaseObject.deaths,
  };
};

function logger(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const bcryptedPswrd = await bcrypt.hash(password, 10);

  const find_user = `SELECT * FROM user WHERE username = '${username}';`;

  if (find_user === undefined) {
    response.status(400);
    response.send("invalid USER ");
  } else {
    const checkPSWRD = await bcrypt.compare(password, find_user.password);

    if (checkPSWRD === true) {
      const payload = {
        username: username,
      };
      const serverJWTtoken = jwtwebtoken.sign(payload, "xxx");
      response.send({ serverJWTtoken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

app.get("/states/", logger, async (request, response) => {
  const x = `SELECT * FROM state`;
  const y = await DATABASE.all(x);
  response.send(y.map((eachState) => snakeCase_to_cameCase_STATE(eachState)));
});

//API 3

app.get("/states/:stateId/", logger, async (request, response) => {
  const { stateId } = request.params;
  const x = `SELECT * FROM state WHERE state_id = '${stateId}';`;
  const y = await DATABASE.get(x);
  response.send(y.map((getState) => snakeCase_to_cameCase_STATE(getState)));
});
//API 4
app.post("/districts/", logger, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const xx = `
    INSERT INTO district (district_name,
        state_id,cases,cured,active,deaths)
        
    VALUES (
        '${districtName}','${stateId}',
        '${cases}','${cured}','${active}','${deaths}'
        );`;

  const yy = await DATABASE.run(xx);
  response.send("District Successfully Added");
});

//API 5

app.get("/districts/:districtId/", logger, async (request, response) => {
  const { districtId } = request.params;

  const getDistricts = `
                SELECT * FROM district WHERE district_id ='${districtId}';`;

  const zz = await DATABASE.all(getDistricts);
  response.send(
    zz.map((eachDistrict) => snakeCase_to_cameCase_District(eachDistrict))
  );
});

//API 6

app.delete("/districts/:districtId/", logger, async (request, response) => {
  const { districtId } = request.params;

  const getDelete = `
    SELECT * from district where district_id = '${districtId}';`;

  const zz = await DATABASE.run(getDelete);
  response.send("District Removed");
});

/// API => 7

app.put("/districts/:districtId/", logger, async (request, resoponse) => {
  const { districtId } = request.params;

  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const update = `
  UPDATE district

   SET('${districtName}',
    '${stateId}', 
    '${cases}',
     '${cured}', 
     '${active}', 
     '${deaths}')`;

  const zz = await DATABASE.run(update);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", logger, async (request, response) => {
  const { status } = request.params;

  const { cases, cured, active, deaths } = request.body;

  const getTotal = `
    SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
     FROM state
    WHERE state_id = '${stateId}';`;

  const stats = await DATABASE.get(getTotal);
  response.send({
    totalCases: stats["SUM(case)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

module.exports = app;
