import express from 'express';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, getIdToken } from 'firebase/auth';
import admin from 'firebase-admin';
import jwt from "jsonwebtoken"
// fill the path with your service account json
import serviceAccount from './serviceAccount.json' with {"type" : 'json'};

const firebaseConfig = {
  apiKey: 'your-firebase-api-key',
  authDomain: 'your-firebase-auth-domain',
  projectId: `your-firebase-project-id`,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const appServer = express();
appServer.use(express.json());

appServer.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    res.status(201).json({ message: 'User registered successfully', userId: user.uid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

appServer.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await getIdToken(user);
    res.status(200).json({ message: 'User logged in successfully', userId: user.uid, token: idToken });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const KONG_JWT_SECRET = "put-your-jwt-secret"
appServer.post('/auth', async (req, res) => {
    const firebaseToken = req.body.token;
    try {
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const kongJwt = jwt.sign(
        {
          sub: decodedToken.uid,
          email: decodedToken.email,
          iss : decodedToken.iss
        },
        KONG_JWT_SECRET,
        { expiresIn: '1h' }
      );
      res.json({ token: kongJwt, iss : decodedToken.iss });
    } catch (error) {
        console.log(error)
      res.status(401).json({ error: 'Authentication failed' });
    }
  });

const router = express.Router();
// mocking protected endpoint
router.get('/mock' , async (req, res) => {
    console.log("PASS !")
    res.json({ message:"you pass!" }) 
});

appServer.use('/protected', router);
const PORT = process.env.PORT || 3000;
appServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
