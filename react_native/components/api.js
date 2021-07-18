const serverip = 'your ip' // run ipconfig in a terminal and find your local ipv4 (should be something like 10.0.0.162). 
const serverport = '3000'     // NOTE: you HAVE to run the local server from the other git repo (intral-server) for pulling to work.
const fullurl = `http://${serverip}:${serverport}/login/`;

export const getGrades = async(username, password, quarter, type) => {             // NOTE: MUST ENCRYPT DATA BEFORE SENDING IN PRODUCTION BUILD!!! 
    try {                                                                          // We can't send plaintext passwords over unprotected networks!!!
        const response = await fetch(fullurl + 'grades', {                
            method: 'POST',                                                        
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user: username,
                passwd: password,
                qtr: quarter,
                type: type
            })
        });
        let json = await response.json(); // convert the response to a javascript object from a json string
        return json;
    } catch (err) {
        console.log(err);
    }
};

export const getStudentInfo = async(username, password) => {
    try {
        const response = await fetch(fullurl + 'studentInfo', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user: username,
                password: password,
            })
        });
        let json = await response.json();
        return json;
    } catch (err) {
        console.log(err);
    }
}