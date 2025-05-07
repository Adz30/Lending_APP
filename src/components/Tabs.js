import Nav from 'react-bootstrap/Nav';
import { LinkContainer } from "react-router-bootstrap";

const Tabs = () => {
  return (
    <Nav variant="pills" defaultActiveKey="/" className='justify-content-center my-4'>
      <LinkContainer to="/">
        <Nav.Link>VaultStatus</Nav.Link>
      </LinkContainer>
      <LinkContainer to="Earn">
        <Nav.Link>Earn</Nav.Link>
      </LinkContainer>
      <LinkContainer to="/LendTokens">
        <Nav.Link>Loans</Nav.Link>
      </LinkContainer>
    </Nav>
  );
}

export default Tabs;