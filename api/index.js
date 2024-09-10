const express = require("express");
const path = require("path");
const app = express();
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");

app.use(express.static(path.join(__dirname, "..")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "/index.html"));
});

app.get("/busData", async (req, res) => {
    try {
        const busData = await fetch("https://gtfs.halifax.ca/realtime/Vehicle/VehiclePositions.pb");

        if (!busData.ok) {
            const error = new Error(`${busData.url}: ${busData.status} ${busData.statusText}`);
            error.response = busData;
            throw error;
        }
        const buffer = await busData.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        return res.json(feed);
    } catch (error) {
        console.log(error);
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server listening on port 3000");
});

module.exports = app;
