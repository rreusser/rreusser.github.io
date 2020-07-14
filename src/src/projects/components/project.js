import React from 'react';
import regl from 'regl';

class Project extends React.Component {
  render () {
    return <a href={this.props.url} className="projectDesc">
      <img src={this.props.image} className="projectDesc__thumb"/>
      <div className="projectDesc__meta">
        {this.props.children}
      </div>
    </a>
  }
}

export default Project;
