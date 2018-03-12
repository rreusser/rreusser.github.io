const React = require('react');

class Book extends React.Component {
  render () {
    return (
      <div className="book" itemProp="mainEntity" itemScope itemType="http://schema.org/Book" style={{marginBottom:"1.0em", marginLeft:"4.6em", textIndent:"-4.6em"}}>
        <em itemProp="dateCreated" style={{marginRight:"1em"}}>{this.props.dateRead}</em><a href={this.props.url} itemProp="name">{this.props.title}</a>, <span itemProp="author">{this.props.author}</span>
      </div>
    );
  }
}

export default Book;
