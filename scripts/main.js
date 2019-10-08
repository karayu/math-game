/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * Placeholder for easy / hard / really hard modes. Eventually the user can set
 * this
 * 1 = easy, 2 = moderate, 3 = hard
 */
var playMode = 1;

// Shortcuts to DOM Elements.
var answerForm = document.getElementById('answer-form');
var answerInput = document.getElementById('result');
var signInButton = document.getElementById('sign-in-button');
var signOutButton = document.getElementById('sign-out-button');
var splashPage = document.getElementById('page-splash');
var startGamePage = document.getElementById('start-game-page');
var startButton = document.getElementById('start-button');
var nextButton = document.getElementById('next-button');
var inputOne = document.getElementById('input-one');
var inputTwo = document.getElementById('input-two');
var addPost = document.getElementById('add-result');
var gameResultPage = document.getElementById('game-result-page');
//var addButton = document.getElementById('add');
var listeningFirebaseRefs = [];

/**
 * Generate new inputs for a new Game
 */
function generateNewInputs() {
  var gameInputs = {};
  var inputOne = Math.floor(Math.random()*10*playMode);
  var inputTwo = Math.floor(Math.random()*10*playMode);

  //TO DO: make operation multiplication or addition
  var operation;

  gameInputs = {
    inputOne: inputOne,
    inputTwo: inputTwo,
    correctResult: parseInt(inputOne) + parseInt(inputTwo),
    start_timestamp: Math.floor(Date.now()/1000)
  };

  return gameInputs;
}

/**
 * Create a new game and write it in the game and player databases
 */
//TODO: start timer rundown
function createNewGame() {
  var inputs = generateNewInputs();

  //Show the user the form for entering their answer (and populate with game
  //values)
  showSection(addPost);
  inputOne.innerHTML = inputs.inputOne;
  inputTwo.innerHTML = inputs.inputTwo;

  //Create new game (with no user answers) and write it in the databases
  var newGameKey = firebase.database().ref().child('games').push().key;

  //Add the initiated game to the game database
  var updates = {};
  updates['/posts/' + newGameKey] = inputs;

  //Add a listener to the answer submission form
  //When form submits, update database and show the results page
  answerForm.onsubmit = function(e) {
    e.preventDefault();
    var text = answerInput.value;
    var inputOneVal = inputOne.innerHTML;
    var inputTwoVal = inputTwo.innerHTML;
    var timestamp = Math.floor(Date.now()/1000);
    if (text) {
      //add the user's answer to the database
      newPostForCurrentUser(newGameKey, inputOneVal, inputTwoVal, text).then(
        function() {
          //showGameResult(newGameKey, inputOneVal, inputTwoVal, text, timestamp);
          //myPostsMenuButton.click();
      });
      answerInput.value = '';
      //TODO move this to show from server
    }
  };
  return firebase.database().ref().update(updates);
}

/**
 * Updates game result page with data
 */
function showGameResult(data) {
  showSection(gameResultPage);

  var successStatus = document.getElementById('correct-status');
  document.getElementById('result-input-one').innerHTML = data.inputOne;
  document.getElementById('result-input-two').innerHTML = data.inputTwo;
  document.getElementById('user-result').innerHTML = data.userResult;

  if(data.userResult && data.correctResult && (data.userResult == data.correctResult)) {
    //TODO: save correctness on server increment score or something?
    successStatus.innerHTML = "CORRECT";
    successStatus.className = "right-answer";
  }
  else {
    successStatus.innerHTML = "WRONG";
    successStatus.className = "wrong-answers";
  }

  document.getElementById('user-time').innerHTML = data.user_time;
}



/**
 * Saves a new post to the Firebase DB.
 */


// [START write_fan_out]
// Write the results of a game
function writeNewPost(uid, gameKey, username, inputOne, inputTwo, userResult) {

  //retrieve previous start timestamp to compute how long user took
  var start_timestamp;
  firebase.database().ref('/posts/' + gameKey).once('value').then(function(snapshot) {
    var data = snapshot.val();
    start_timestamp = data.start_timestamp;


    // Get the user's data entry (result and time)
    var postData = {
      author: username,
      uid: uid,
      inputOne: parseInt(inputOne),
      inputTwo: parseInt(inputTwo),
      userResult: parseInt(userResult),
      correctResult: parseInt(inputOne) + parseInt(inputTwo),
      user_time: (Math.floor(Date.now()/1000) - start_timestamp)
    };

    console.log("new entry is: ");
    console.log(postData);

    // Write the new post's data simultaneously in the posts list and the user's post list.
    var updates = {};
    updates['/posts/' + gameKey] = postData;
    updates['/user-posts/' + uid + '/' + gameKey] = postData;

    showGameResult(postData);

    return firebase.database().ref().update(updates);
  });
}
// [END write_fan_out]

/**
 * Writes a new comment for the given post.
 */
function createNewComment(postId, username, uid, text) {
  firebase.database().ref('post-comments/' + postId).push({
    text: text,
    author: username,
    uid: uid
  });
}

/**
 * Updates the starred status of the post.
 */
function updateStarredByCurrentUser(postElement, starred) {
  if (starred) {
    postElement.getElementsByClassName('starred')[0].style.display = 'inline-block';
    postElement.getElementsByClassName('not-starred')[0].style.display = 'none';
  } else {
    postElement.getElementsByClassName('starred')[0].style.display = 'none';
    postElement.getElementsByClassName('not-starred')[0].style.display = 'inline-block';
  }
}


/**
 * Creates a comment element and adds it to the given postElement.
 */
function addCommentElement(postElement, id, text, author) {
  var comment = document.createElement('div');
  comment.classList.add('comment-' + id);
  comment.innerHTML = '<span class="username"></span><span class="comment"></span>';
  comment.getElementsByClassName('comment')[0].innerText = text;
  comment.getElementsByClassName('username')[0].innerText = author || 'Anonymous';

  var commentsContainer = postElement.getElementsByClassName('comments-container')[0];
  commentsContainer.appendChild(comment);
}

/**
 * Sets the comment's values in the given postElement.

function setCommentValues(postElement, id, text, author) {
  var comment = postElement.getElementsByClassName('comment-' + id)[0];
  comment.getElementsByClassName('comment')[0].innerText = text;
  comment.getElementsByClassName('fp-username')[0].innerText = author;
}

/**
 * Deletes the comment of the given ID in the given postElement.

function deleteComment(postElement, id) {
  var comment = postElement.getElementsByClassName('comment-' + id)[0];
  comment.parentElement.removeChild(comment);
}
*/

/**
 * Starts listening for new posts and populates posts lists.

function startDatabaseQueries() {
  // [START my_top_posts_query]
  var myUserId = firebase.auth().currentUser.uid;
  var topUserPostsRef = firebase.database().ref('user-posts/' + myUserId).orderByChild('starCount');
  // [END my_top_posts_query]
  // [START recent_posts_query]
  var recentPostsRef = firebase.database().ref('posts').limitToLast(100);
  // [END recent_posts_query]
  var userPostsRef = firebase.database().ref('user-posts/' + myUserId);

  var fetchPosts = function(postsRef, sectionElement) {
    postsRef.on('child_changed', function(data) {
		var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
		var postElement = containerElement.getElementsByClassName('post-' + data.key)[0];
		postElement.getElementsByClassName('mdl-card__title-text')[0].innerText = data.val().title;
		postElement.getElementsByClassName('username')[0].innerText = data.val().author;
		postElement.getElementsByClassName('text')[0].innerText = data.val().body;
		postElement.getElementsByClassName('star-count')[0].innerText = data.val().starCount;
    });
    postsRef.on('child_removed', function(data) {
		var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
		var post = containerElement.getElementsByClassName('post-' + data.key)[0];
	    post.parentElement.removeChild(post);
    });
  };

  // Fetching and displaying all posts of each sections.
  fetchPosts(topUserPostsRef, topUserPostsSection);
  fetchPosts(recentPostsRef, recentPostsSection);
  fetchPosts(userPostsRef, userPostsSection);

  // Keep track of all Firebase refs we are listening to.
  listeningFirebaseRefs.push(topUserPostsRef);
  listeningFirebaseRefs.push(recentPostsRef);
  listeningFirebaseRefs.push(userPostsRef);
}
*/


/**
 * Writes the user's data to the database.
 */
// [START basic_write]
function writeUserData(userId, name, email, imageUrl) {
  firebase.database().ref('users/' + userId).set({
    username: name,
    email: email,
    profile_picture : imageUrl
  });
}
// [END basic_write]

/**
 * Cleanups the UI and removes all Firebase listeners.
 */
function cleanupUi() {
  // Remove all previously displayed posts.
  /*topUserPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  recentPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  userPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  */


  // Stop all currently listening Firebase listeners.
  listeningFirebaseRefs.forEach(function(ref) {
    ref.off();
  });
  listeningFirebaseRefs = [];
}

/**
 * The ID of the currently signed-in User. We keep track of this to detect Auth state change events that are just
 * programmatic token refresh but not a User status change.
 */
var currentUID;

/**
 * Triggers every time there is a change in the Firebase auth state (i.e. user signed-in or user signed out).
 */
function onAuthStateChanged(user) {
  // We ignore token refresh events.
  if (user && currentUID === user.uid) {
    return;
  }

  cleanupUi();
  if (user) {
    currentUID = user.uid;
    splashPage.style.display = 'none';
    writeUserData(user.uid, user.displayName, user.email, user.photoURL);
    //startDatabaseQueries();
  } else {
    // Set currentUID to null.
    currentUID = null;
    // Display the splash page where you can sign-in.
    splashPage.style.display = '';
  }
}

/**
 * Creates a new post for the current user.
 */
function newPostForCurrentUser(gameKey, inputOneVal, inputTwoVal, userResult) {
  // [START single_value_read]
  var userId = firebase.auth().currentUser.uid;
  return firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
    var username = (snapshot.val() && snapshot.val().username) || 'Anonymous';
    // [START_EXCLUDE]
    return writeNewPost(firebase.auth().currentUser.uid, gameKey, username,
        inputOneVal, inputTwoVal, userResult);
    // [END_EXCLUDE]
  });
  // [END single_value_read]
}

/**
 * Displays the given section element and changes styling of the given button.
 */
function showSection(sectionElement, buttonElement) {
  /*
  recentPostsSection.style.display = 'none';
  userPostsSection.style.display = 'none';
  topUserPostsSection.style.display = 'none';
  */
  startGamePage.style.display = 'none';
  addPost.style.display = 'none';
  //recentMenuButton.classList.remove('is-active');
  //myPostsMenuButton.classList.remove('is-active');
  //myTopPostsMenuButton.classList.remove('is-active');

  if (sectionElement) {
    sectionElement.style.display = 'block';
  }
  if (buttonElement) {
    buttonElement.classList.add('is-active');
  }
}

// Bindings on load.
window.addEventListener('load', function() {
  // Bind Sign in button.
  signInButton.addEventListener('click', function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/plus.login');
    firebase.auth().signInWithPopup(provider);

  });

  // Bind Sign out button.
  signOutButton.addEventListener('click', function() {
    firebase.auth().signOut();
  });

  // Listen for auth state changes
  firebase.auth().onAuthStateChanged(onAuthStateChanged);


  startButton.onclick = function () {
    createNewGame();
    answerInput.value = '';
  }

  nextButton.onclick = function () {
      // Remove previous game result
      gameResultPage.style.display = 'none';
      createNewGame();
      answerInput.value = '';
  }


  /*
  // Bind menu buttons.
  recentMenuButton.onclick = function() {
    showSection(recentPostsSection, recentMenuButton);
  };
  myPostsMenuButton.onclick = function() {
    showSection(userPostsSection, myPostsMenuButton);
  };
  myTopPostsMenuButton.onclick = function() {
    showSection(topUserPostsSection, myTopPostsMenuButton);
  };
  */
  //recentMenuButton.onclick();
}, false);
