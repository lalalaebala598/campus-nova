# Campus Nova 13.0.0 Final

Campus Nova is a modern frontend shell over an original Moodle/Campus instance.

## Run

Requirements: Node.js 20+

Windows:

1. Extract the archive.
2. Open the folder.
3. Double-click `START_CAMPUS_NOVA.bat` or run `node backend/src/server.js`.
4. Open `http://localhost:3000`.

## Connect a Campus

On the Nova login screen enter:

- Campus URL, for example `https://campus.fa.ru`
- Campus username
- Campus password

The selected Campus URL becomes the session-scoped backend target. Nova keeps the Campus password transiently for the login request and does not store it in the Nova profile.

## Runtime architecture

Nova UI → Domain API → Campus Adapter →
Web Service / AJAX / Web Form / File transport → Original Campus

Courses are resolved through the Course Graph and Activity Index. When structured activity data is unavailable, Nova can keep the real Campus course page as a compatibility payload rather than inventing an empty course.

## Important

State-changing workflows are guarded by real Campus contracts. Nova does not report fake success for unverified operations.
