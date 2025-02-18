const React = require('react');

class Footer extends React.PureComponent {
  render () {
    return (
      <footer className="footer">
        <div className="footer__content">
          <div className="footer_copy">© 2025 Ricky Reusser</div>
        </div>
      </footer>
    );
  }
}

module.exports = Footer;
