const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let threadId;
  let replyId;
  const board = 'testboard';

  test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
    chai.request(server)
      .post('/api/threads/' + board)
      .send({ text: 'Functional test thread', delete_password: 'password' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        // should redirect back to the board page
        assert.isAbove(res.redirects.length, 0);
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
    chai.request(server)
      .get('/api/threads/' + board)
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body, 'Response should be an array of threads');
        assert.isAtMost(res.body.length, 10, 'No more than 10 threads');
        const t = res.body[0];
        assert.property(t, '_id');
        assert.property(t, 'text');
        assert.property(t, 'created_on');
        assert.property(t, 'bumped_on');
        assert.notProperty(t, 'delete_password');
        assert.notProperty(t, 'reported');
        assert.isArray(t.replies, 'Replies should be an array');
        assert.isAtMost(t.replies.length, 3, 'No more than 3 replies');
        threadId = t._id;
        done();
      });
  });

  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function(done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId, delete_password: 'wrongpassword' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
    chai.request(server)
      .put('/api/threads/' + board)
      .send({ thread_id: threadId })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
    chai.request(server)
      .post('/api/replies/' + board)
      .send({ thread_id: threadId, text: 'Test reply', delete_password: 'replypass' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        // should redirect back to the thread page
        assert.isAbove(res.redirects.length, 0);
        done();
      });
  });

  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
    chai.request(server)
      .get('/api/replies/' + board)
      .query({ thread_id: threadId })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        const th = res.body;
        assert.property(th, '_id');
        assert.property(th, 'text');
        assert.property(th, 'created_on');
        assert.property(th, 'bumped_on');
        assert.isArray(th.replies, 'Replies should be an array');
        assert.isAtLeast(th.replies.length, 1, 'There should be at least one reply');
        const r = th.replies[0];
        assert.property(r, '_id');
        assert.property(r, 'text');
        assert.property(r, 'created_on');
        assert.notProperty(r, 'delete_password');
        assert.notProperty(r, 'reported');
        replyId = r._id;
        done();
      });
  });

  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function(done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'wrongpass' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function(done) {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({ thread_id: threadId, reply_id: replyId, delete_password: 'replypass' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
    // Make a fresh reply to report
    chai.request(server)
      .post('/api/replies/' + board)
      .send({ thread_id: threadId, text: 'Reply to report', delete_password: 'reportpass' })
      .end(function(err, res) {
        // Now fetch all replies to find its _id
        chai.request(server)
          .get('/api/replies/' + board)
          .query({ thread_id: threadId })
          .end(function(err2, res2) {
            const fresh = res2.body.replies.find(r => r.text === 'Reply to report');
            chai.request(server)
              .put('/api/replies/' + board)
              .send({ thread_id: threadId, reply_id: fresh._id })
              .end(function(err3, res3) {
                assert.equal(res3.status, 200);
                assert.equal(res3.text, 'reported');
                done();
              });
          });
      });
  });

  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function(done) {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({ thread_id: threadId, delete_password: 'password' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });
});
