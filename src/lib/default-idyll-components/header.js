import React from 'react';

class Header extends React.PureComponent {
  render () {
    return (
      <div className={'article-header'}>
        <div className={'article-header__content'}>
          <h1 className={'hed'}>
            {this.props.title}
          </h1>
          {
            this.props.subtitle && (
              <h2 className={'dek'}>
                {this.props.subtitle}
              </h2>
            )
          }
          {
            this.props.author && (
              <div className={'byline'}>
                <a href={this.props.authorLink}>{this.props.author}</a>
              </div>
            )
          }
          {
            this.props.date && (
              <div className={'published-at'}>
                {this.props.date}
              </div>
            )
          }
        </div>
      </div>
    );
  }
}

export default Header;
