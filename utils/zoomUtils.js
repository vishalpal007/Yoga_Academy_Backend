const axios = require("axios");
const qs = require("qs");

const getAccessToken = async () => {
    const tokenRes = await axios.post("https://zoom.us/oauth/token", null, {
        params: {
            grant_type: "account_credentials",
            account_id: process.env.ZOOM_ACCOUNT_ID // You'll need to use Server-to-Server OAuth
        },
        auth: {
            username: process.env.ZOOM_CLIENT_ID,
            password: process.env.ZOOM_CLIENT_SECRET
        }
    });

    return tokenRes.data.access_token;
};

const createZoomMeeting = async (topic, start_time, duration) => {
    try {
        const accessToken = await getAccessToken();

        const response = await axios.post(
            "https://api.zoom.us/v2/users/me/meetings",
            {
                topic,
                type: 2,
                start_time,
                duration,
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error("❗ Zoom API Error:", error.response?.data || error.message);
        throw new Error("Zoom API Error: " + JSON.stringify(error.response?.data || error.message));
    }
};


module.exports = {
    createZoomMeeting,
};
