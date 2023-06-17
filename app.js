const express = require("express");
const app = express();
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");

// For Cyclic
const OPTION = {
    dotfiles: "ignore",
    etag: false,
    extensions: ["htm", "html", "css", "js", "ico", "jpg", "jpeg", "png", "svg"],
    index: ["index.html"],
    maxAge: "1m",
    redirect: false
};
app.use(express.static("/", OPTION));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
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
    console.log("SERVER LISTENING!");
});
