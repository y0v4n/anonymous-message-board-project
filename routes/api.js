'use strict';

const { ObjectId } = require('mongodb');

module.exports = function(app, db) {
  // In‐memory store: { [boardName]: [ threadObj, … ] }
  const memory = {};

  // THREAD ROUTES
  app.route('/api/threads/:board')
    // 1) Create a new thread
    .post((req, res) => {
      const board = req.params.board;
      const { text, delete_password } = req.body;
      const now = new Date();
      const thread = {
        _id: new ObjectId(),
        text,
        delete_password,
        created_on: now,
        bumped_on: now,
        reported: false,
        replies: []
      };
      // insert into memory
      memory[board] = memory[board] || [];
      memory[board].unshift(thread);
      // keep only 10
      if (memory[board].length > 10) memory[board].pop();
      // immediate redirect
      res.redirect(`/b/${board}/`);
    })

    // 2) View the 10 most recent threads with up to 3 replies each
    .get((req, res) => {
      const board = req.params.board;
      const list = memory[board] || [];
      const output = list
        .sort((a, b) => b.bumped_on - a.bumped_on)
        .slice(0, 10)
        .map(t => ({
          _id: t._id,
          text: t.text,
          created_on: t.created_on,
          bumped_on: t.bumped_on,
          replies: t.replies
            .slice(-3)
            .map(r => ({
              _id: r._id,
              text: r.text,
              created_on: r.created_on
            }))
        }));
      res.json(output);
    })

    // 3) Delete a thread
    .delete((req, res) => {
      const board = req.params.board;
      const { thread_id, delete_password } = req.body;
      const list = memory[board] || [];
      const idx = list.findIndex(t => t._id.toString() === thread_id);
      if (idx === -1 || list[idx].delete_password !== delete_password) {
        return res.send('incorrect password');
      }
      list.splice(idx, 1);
      res.send('success');
    })

    // 4) Report a thread
    .put((req, res) => {
      const board = req.params.board;
      const { thread_id } = req.body;
      const list = memory[board] || [];
      const thread = list.find(t => t._id.toString() === thread_id);
      if (thread) thread.reported = true;
      res.send('reported');
    });

  // REPLY ROUTES
  app.route('/api/replies/:board')
    // 5) Create a new reply
    .post((req, res) => {
      const board = req.params.board;
      const { thread_id, text, delete_password } = req.body;
      const list = memory[board] || [];
      const thread = list.find(t => t._id.toString() === thread_id);
      if (!thread) return res.sendStatus(404);
      const now = new Date();
      const reply = {
        _id: new ObjectId(),
        text,
        delete_password,
        created_on: now,
        reported: false
      };
      thread.replies.push(reply);
      thread.bumped_on = now;
      res.redirect(`/b/${board}/${thread_id}`);
    })

    // 6) View a single thread with all replies
    .get((req, res) => {
      const board = req.params.board;
      const thread_id = req.query.thread_id;
      const list = memory[board] || [];
      const thread = list.find(t => t._id.toString() === thread_id);
      if (!thread) return res.sendStatus(404);
      res.json({
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies.map(r => ({
          _id: r._id,
          text: r.text,
          created_on: r.created_on
        }))
      });
    })

    // 7) Delete a reply
    .delete((req, res) => {
      const board = req.params.board;
      const { thread_id, reply_id, delete_password } = req.body;
      const list = memory[board] || [];
      const thread = list.find(t => t._id.toString() === thread_id);
      if (!thread) return res.sendStatus(404);
      const reply = thread.replies.find(r => r._id.toString() === reply_id);
      if (!reply || reply.delete_password !== delete_password) {
        return res.send('incorrect password');
      }
      reply.text = '[deleted]';
      res.send('success');
    })

    // 8) Report a reply
    .put((req, res) => {
      const board = req.params.board;
      const { thread_id, reply_id } = req.body;
      const list = memory[board] || [];
      const thread = list.find(t => t._id.toString() === thread_id);
      if (thread) {
        const reply = thread.replies.find(r => r._id.toString() === reply_id);
        if (reply) reply.reported = true;
      }
      res.send('reported');
    });

};
