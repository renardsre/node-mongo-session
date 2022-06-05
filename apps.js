const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const MongoDBSession = require('connect-mongodb-session')(session);
const mongoose = require('mongoose');
const app = express();
const UserModel = require('./models/User');

const mongoURI = "mongodb://localhost:27017/sessions"

mongoose
  .connect(mongoURI)
  .then(res => {
    console.log('MongoDB connected');
  });

const store = new MongoDBSession({
  uri: mongoURI,
  collection: "mySessions",
});

app.set("view engine", "ejs");
app.use(express.urlencoded({ extend: true }));
app.use(express.json());

app.use(session({
  name: 'test session',
  secret: 'this-is-session-secret',
  resave: false,
  saveUninitialized: false, 
  expires: new Date(Date.now() + (60 * 1000)),
  store: store,
  cookie: { 
    secure: false, // This will only work if you have https enabled!
    maxAge: 60000 // 1 min
  } 
}));

const isAuth = (_, res, next) => {
  if (_.session.isAuth) {
    next()
  } else {
    _.res.redirect('/login')
  }
}

app.get('/', (_, res) => {
  // _.session.isAuth = true;
  if (_.session.isAuth) return res.redirect('/dashboard');

  console.log(_.session);
  console.log(_.session.id);
  // _.send('hello world!!');

  res.render('landing');
});

app.get('/login', (_, res) => {
  if (_.session.isAuth) return res.redirect('/dashboard');

  res.render('login');
});

app.post('/login', async (_, res) => {
  const { email, password } = _.body;

  const user = await UserModel.findOne({ email });
  
  if (!user) return res.redirect('/login');

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) return res.redirect('/login');

  _.session.isAuth = true;

  res.redirect('/dashboard');
});

app.get('/register', (_, res) => {
  res.render('register');
});

app.post('/register', async (_, res) => {
  const {username, email, password} = _.body;

  let user = await UserModel.findOne({email});
  
  if (user) {
    return res.redirect('/login');
  };

  const hashedPsw = await bcrypt.hash(password, 12);

  user = new UserModel({
    username,
    email,
    password: hashedPsw
  });

  await user.save();

  res.redirect('/login');
})

app.get('/dashboard', isAuth, (_, res) => {
  res.render('dashboard');
})

app.post('/logout', (_,res) => {
  _.session.destroy((err) => {
    if (err) throw err;
    res.redirect('/');
  })
})

app.listen(5000, console.log(`${Date()}
Server is running on http://localhost:5000`));

