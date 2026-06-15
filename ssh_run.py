#!/usr/bin/env python3
"""Tiny helper to run remote shell commands or copy files over SSH with a password."""
import paramiko
import sys
import os
import argparse


def open_client(host: str, user: str, password: str, port: int = 22) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        port=port,
        username=user,
        password=password,
        timeout=15,
        banner_timeout=15,
        auth_timeout=15,
    )
    return client


def cmd_run(args):
    client = open_client(args.host, args.user, args.password, args.port)
    try:
        stdin, stdout, stderr = client.exec_command(args.command, timeout=args.timeout, get_pty=False)
        out = stdout.read().decode("utf-8", "replace")
        err = stderr.read().decode("utf-8", "replace")
        rc = stdout.channel.recv_exit_status()
        if out:
            sys.stdout.write(out)
        if err:
            sys.stderr.write(err)
        sys.exit(rc)
    finally:
        client.close()


def cmd_put(args):
    client = open_client(args.host, args.user, args.password, args.port)
    try:
        sftp = client.open_sftp()
        sftp.put(args.local, args.remote)
        sftp.close()
        print(f"PUT {args.local} -> {args.remote}")
    finally:
        client.close()


def cmd_get(args):
    client = open_client(args.host, args.user, args.password, args.port)
    try:
        sftp = client.open_sftp()
        sftp.get(args.remote, args.local)
        sftp.close()
        print(f"GET {args.remote} -> {args.local}")
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", default="root")
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--password", default=os.environ.get("SSH_PASS", ""))
    sub = parser.add_subparsers(dest="action", required=True)

    r = sub.add_parser("run")
    r.add_argument("command")
    r.add_argument("--timeout", type=int, default=120)
    r.set_defaults(func=cmd_run)

    p = sub.add_parser("put")
    p.add_argument("local")
    p.add_argument("remote")
    p.set_defaults(func=cmd_put)

    g = sub.add_parser("get")
    g.add_argument("remote")
    g.add_argument("local")
    g.set_defaults(func=cmd_get)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
