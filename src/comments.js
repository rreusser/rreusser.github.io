import { html } from "htm/preact";
import { render, h } from 'preact';
import { useRef, useEffect, useContext, useState } from "preact/hooks";

function timeSince(date) {
  var seconds = Math.floor((new Date() - date) / 1000);
  var interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes";
  return Math.floor(seconds) + " seconds";
}

const SERVER = 'https://mathstodon.xyz';

async function loadComments(postId) {
  const url = `${SERVER}/api/v1/statuses/${postId}/context`
  const response = await fetch(url);
  if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
  }
  return await response.json();
}

export default function Comments ({postId}) {
  const [comments, setComments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(async () => {
    try {
      const comments = await loadComments(postId);
      setComments(comments.descendants);
      setError(null);
      // Surface the reply count in the collapsible "Comments" label, if present.
      const countEl = document.querySelector('.comments-toggle__count');
      if (countEl && comments.descendants.length) {
        countEl.textContent = `(${comments.descendants.length})`;
      }
    } catch (e) {
      setError('Unable to load comments');
    }
  }, []);

  if (error) {
    return html`
      <div class="comments_loading">${error}</div>
    `;
  } else if (comments === null) {
    return html`
      <div class="comments_loading">
        <div class="spinner threebody">
          <div class="threebody-o"><div/><div/><div/></div>
        </div>
        <div>Loading comments...</div>
      </div>`;
  } else {
    return html`
      <div class="comments">
        <div class="comments_meta">
          <div class="comments_count">${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}</div>
          <a href="${SERVER}/@rreusser/${postId}">Reply on Mastodon →</a>
        </div>
        ${comments.map(comment => html`
          <a class="comment" href="${SERVER}/@${comment.account.acct}/${comment.id}">
            <div class="comment_meta">
              <a href=${comment.account.url} class="comment_user">
                <img src=${comment.account.avatar_static}/>
                <div>
                  <div class="comment_displayname">${comment.account.display_name}</div>
                  <div class="comment_commenter">${comment.account.acct}</div>
                </div>
              </div
              </a>
              <a class="comment_ago" href="${SERVER}/@${comment.account.acct}/${comment.id}">
                ${timeSince(new Date(comment.created_at))} ago
              </a>
            </div>
            <div key=${comment.id} class="comment_content" dangerouslySetInnerHTML=${{ __html: comment.content}}/>
          </a>
        `)}
      </div>
    `;
  }
}

const root = document.getElementById('comment-root');

if (root) {
  render(
    h(Comments, {postId: root.getAttribute('data-post-id')}),
    root
  );
}
