import React from 'react';

class Article extends React.Component {
  render () {
    return (
      <div className="article" itemProp="mainEntity" itemScope itemType="http://schema.org/Article">
        <a href={'../' + this.props.path} className="article__title" itemProp="name">{this.props.title}</a>
        <br/>
        <em itemProp="dateCreated" className="article__date">{this.props.date}</em>
        {this.props.summary && (<p>{this.props.summary}</p>)}
      </div>
    );
  }
}

export default Article;
