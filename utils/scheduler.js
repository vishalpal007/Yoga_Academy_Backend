const cron = require("node-cron");
const Course = require("../models/Admin/Course");
const { sendEmail } = require("./otpUtils");

cron.schedule("* * * * *", async () => {
    console.log(`[CRON] Running reminder check at ${new Date().toLocaleString("en-IN")}`);

    try {
        const now = new Date();
        const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
        const formattedTargetTime = tenMinutesLater.toISOString().slice(0, 16);

        const courses = await Course.find({}).populate("enrolledUsers.user", "name email");

        for (let course of courses) {
            console.log(`🔍 Checking course: ${course.title}`);

            for (let session of course.liveSessions) {
                const sessionTime = new Date(session.dateTime).toISOString().slice(0, 16);

                if (!session.reminderSent && sessionTime === formattedTargetTime) {
                    console.log(`📣 Sending reminders for session: ${session.title} at ${sessionTime}`);

                    for (let enrolled of course.enrolledUsers) {
                        if (!enrolled.user?.email) {
                            console.warn(`⚠️ Skipping user without email in course ${course.title}`);
                            continue;
                        }

                        try {
                            await sendEmail({
                                to: enrolled.user.email,
                                subject: `Live Session in 10 Minutes: ${session.title}`,
                                html: `
                  <p>Hi ${enrolled.user.name},</p>
                  <p>Your yoga session <strong>${session.title}</strong> will begin soon.</p>
                  <p>Meeting Link: <a href="${session.meetingLink}">${session.meetingLink}</a></p>
                `
                            });
                            console.log(`✅ Email sent to: ${enrolled.user.email}`);
                        } catch (emailErr) {
                            console.error(`❌ Failed to send email to ${enrolled.user.email}:`, emailErr.message);
                        }
                    }

                    // Admin email
                    try {
                        await sendEmail({
                            to: "vp461365@gmail.com",
                            subject: `Reminder: Your live session starts in 10 minutes`,
                            html: `
                <p>Hi Admin,</p>
                <p>You have a live session <strong>${session.title}</strong> scheduled to start soon.</p>
                <p>Meeting Link: <a href="${session.meetingLink}">${session.meetingLink}</a></p>
              `
                        });
                        console.log(`✅ Admin email sent.`);
                    } catch (adminErr) {
                        console.error(`❌ Failed to send email to admin:`, adminErr.message);
                    }

                    session.reminderSent = true;
                }
            }

            await course.save();
        }

        console.log(`[CRON] Reminder check complete ✅\n`);
    } catch (err) {
        console.error(`[CRON ERROR]`, err.message);
    }
});
