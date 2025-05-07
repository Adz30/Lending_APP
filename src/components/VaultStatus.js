import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import Table from "react-bootstrap/Table";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import React from "react";
import { addLoanEvent } from "../store/reducers/VaultA";
import { ethers } from "ethers";

const VaultStatus = () => {
  const dispatch = useDispatch();
  const provider = useSelector((state) => state.provider.connection);
  const account = useSelector((state) => state.provider.account);

  const { contracts, symbols, balances } = useSelector((state) => state.tokens);
  const controller = useSelector(
    (state) => state.VaultController.VaultController
  );
  const locked = useSelector(
    (state) => state.VaultController.checkLockedStatus
  );

  const VAULT_A = useSelector((state) => state.vaultA.VAULT_A);
  const VAULT_B = useSelector((state) => state.vaultB.VAULT_B);
  const vaultASymbol = useSelector((state) => state.vaultA.VaultASymbol);
  const vaultBSymbol = useSelector((state) => state.vaultB.VaultBSymbol);
  const vaultABalance = useSelector((state) => state.vaultA.vaultABalance);
  const vaultBBalance = useSelector((state) => state.vaultB.vaultBBalance);
  const vaultAShare = useSelector((state) => state.vaultA.vaultAShare);
  const vaultBShare = useSelector((state) => state.vaultB.vaultBShare);

  const loanHistory = useSelector((state) => state.vaultA.loanHistory); // Get the loan history from Redux

  const token0 = contracts[0];
  const token1 = contracts[1];

  const symbol0 = symbols[0];
  const symbol1 = symbols[1];

  const balance0 = balances[0];
  const balance1 = balances[1];

  // Function to listen for LoanIssued events
  useEffect(() => {
    const listenForLoanIssued = async () => {
      if (VAULT_A) {
        VAULT_A.on("LoanIssued", (to, loanAmount, totalRepaymentAmount) => {
          const timestamp = new Date().toLocaleString(); // Current timestamp

          // Slice the address to only show first 6 and last 4 characters
          const slicedAddress = `${to.slice(0, 6)}...${to.slice(-4)}`;

          // Convert loanAmount to readable format (assuming it's in wei)
          const loanAmountInEther = ethers.utils.formatUnits(loanAmount, 18); // Assuming 18 decimals for Ether

          // Generate a unique ID for this loan event using a hash of key properties
          const loanId = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "uint256", "string"],
              [to, loanAmount, totalRepaymentAmount, timestamp]
            )
          );

          // Check if the loan event already exists to avoid duplicates using the loanId
          const eventExists = loanHistory.some(
            (entry) => entry.loanId === loanId
          );

          // If the event doesn't exist, dispatch it
          if (!eventExists) {
            dispatch(
              addLoanEvent({
                loanId, // Store unique loanId
                type: "Loan Issued",
                amount: loanAmountInEther, // Store amount in readable format
                vault: vaultASymbol,
                timestamp: timestamp,
                address: slicedAddress, // Add sliced address
              })
            );
          }
        });
      }
    };

    listenForLoanIssued();

    // Clean up the event listener when the component is unmounted
    return () => {
      if (VAULT_A) {
        VAULT_A.removeListener("LoanIssued", listenForLoanIssued);
      }
    };
  }, [VAULT_A, dispatch, vaultASymbol, loanHistory]);

  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <strong>🔒 Locked Status:</strong> {locked ? "Locked" : "Unlocked"}
      </div>

      <Row>
        {/* Column 1: Token & Vault Balances */}
        <Col md={6}>
          <h5>Token & Vault Balances</h5>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Token Balance</th>
                <th>Vault Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{symbol0}</td>
                <td>{balance0}</td>
                <td>{vaultABalance}</td>
              </tr>
              <tr>
                <td>{symbol1}</td>
                <td>{balance1}</td>
                <td>{vaultBBalance}</td>
              </tr>
            </tbody>
          </Table>
        </Col>

        {/* Column 2: Vault Shares */}
        <Col md={6}>
          <h5>Vault Shares</h5>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Vault</th>
                <th>Share Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{vaultASymbol}</td>
                <td>{vaultAShare}</td>
              </tr>
              <tr>
                <td>{vaultBSymbol}</td>
                <td>{vaultBShare}</td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* Loan Activity Log */}
      <div className="mt-5">
        <h5>Loan Activity Log</h5>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Loan ID</th> {/* New column for Loan ID */}
              <th>Address</th> {/* Display sliced address */}
              <th>Status</th>
              <th>Amount</th>
              <th>Vault</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loanHistory.map((entry, index) => (
              <tr key={index}>
                <td>{entry.loanId}</td> {/* Display Loan ID */}
                <td>{entry.address}</td> {/* Display sliced address */}
                <td>{entry.type}</td>
                <td>{entry.amount}</td>
                <td>{entry.vault}</td>
                <td>{entry.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default VaultStatus;
