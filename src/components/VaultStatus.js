import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Table from "react-bootstrap/Table";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { ethers } from "ethers";

import Faucet from "./Faucet";

import { addLoanEvent } from "../store/reducers/VaultA";

const VaultStatus = () => {
  const dispatch = useDispatch();

  const provider = useSelector((state) => state.provider.connection);
  const account = useSelector((state) => state.provider.account);

  const { symbols, balances } = useSelector((state) => state.tokens);
  const locked = useSelector((state) => state.VaultController.checkLockedStatus);

  const VAULT_A = useSelector((state) => state.vaultA.VAULT_A);
  const vaultASymbol = useSelector((state) => state.vaultA.VaultASymbol);
  const vaultABalance = useSelector((state) => state.vaultA.vaultABalance);
  const vaultAShare = useSelector((state) => state.vaultA.vaultAShare);

  const vaultBBalance = useSelector((state) => state.vaultB.vaultBBalance);
  const vaultBSymbol = useSelector((state) => state.vaultB.VaultBSymbol);
  const vaultBShare = useSelector((state) => state.vaultB.vaultBShare);

  const loanHistory = useSelector((state) => state.vaultA.loanHistory);

  // Listen to LoanIssued events on VAULT_A
  useEffect(() => {
    if (!VAULT_A) return;

    const onLoanIssued = (to, loanAmount, totalRepaymentAmount) => {
      const timestamp = new Date().toLocaleString();
      const slicedAddress = `${to.slice(0, 6)}...${to.slice(-4)}`;
      const loanAmountInEther = ethers.utils.formatUnits(loanAmount, 18);
      const loanId = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256", "uint256", "string"],
          [to, loanAmount, totalRepaymentAmount, timestamp]
        )
      );

      const eventExists = loanHistory.some((entry) => entry.loanId === loanId);

      if (!eventExists) {
        dispatch(
          addLoanEvent({
            loanId,
            type: "Loan Issued",
            amount: loanAmountInEther,
            vault: vaultASymbol,
            timestamp,
            address: slicedAddress,
          })
        );
      }
    };

    VAULT_A.on("LoanIssued", onLoanIssued);

    return () => {
      VAULT_A.off("LoanIssued", onLoanIssued);
    };
  }, [VAULT_A, dispatch, vaultASymbol, loanHistory]);

  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <strong>🔒 Locked Status:</strong> {locked ? "Locked" : "Unlocked"}
      </div>

      <Row>
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
                <td>{symbols[0]}</td>
                <td>{balances[0]}</td>
                <td>{vaultABalance}</td>
              </tr>
              <tr>
                <td>{symbols[1]}</td>
                <td>{balances[1]}</td>
                <td>{vaultBBalance}</td>
              </tr>
            </tbody>
          </Table>
        </Col>

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

      <div className="mt-5">
        <h5>Loan Activity Log</h5>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Loan ID</th>
              <th>Address</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Vault</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loanHistory.map((entry, index) => (
              <tr key={index}>
                <td>{entry.loanId}</td>
                <td>{entry.address}</td>
                <td>{entry.type}</td>
                <td>{entry.amount}</td>
                <td>{entry.vault}</td>
                <td>{entry.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Faucet component */}
      <div className="mt-5">
        <Faucet />
      </div>
    </div>
  );
};

export default VaultStatus;
