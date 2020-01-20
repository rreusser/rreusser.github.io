import React from 'react';
import classNames from 'classnames';

class Menu extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
      expanded: false
    };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick () {
    this.setState({expanded: !this.state.expanded});
  }

  render () {
    return (
      <nav className={classNames("menu", {"menu--expanded": this.state.expanded})}>
        <button className="menu__thumb" onClick={this.handleClick}>
          <span className="menu__hamburger"></span>
          <span className="menu__hamburger"></span>
          <span className="menu__hamburger"></span>
        </button>
        <div className="menu__content">
          <div className="menu__heading">
            <a href="/">rreusser.github.io</a>
          </div>
          <div className="menu__items">
            <a className="menu__item" href="/sketches/">Sketches</a>
            <a className="menu__item" href="/writing/">Writing</a>
            <a className="menu__item" href="https://github.com/rreusser">github.com/rreusser</a>
            <a className="menu__item" href="https://twitter.com/rickyreusser">@rickyreusser</a>
          </div>
        </div>
      </nav>
    );
  }
}

export default Menu;
