import { Component, type ReactNode, type ErrorInfo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import * as Sentry from '@sentry/react';
import { ERROR_MESSAGES } from '../config';

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	message: string;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, message: '' };
	}

	static getDerivedStateFromError(error: Error): State {
		return {
			hasError: true,
			message: error.message || ERROR_MESSAGES.unknownError,
		};
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('[ErrorBoundary]', error, info.componentStack);
		if (import.meta.env.PROD) {
			Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
		}
	}

	handleReset = () => {
		this.setState({ hasError: false, message: '' });
	};

	render() {
		if (this.state.hasError) {
			return (
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						height: '100vh',
						gap: 2,
						p: 4,
					}}
				>
					<Typography variant='h5' color='error'>
						{ERROR_MESSAGES.renderInitFailed}
					</Typography>
					<Typography
						variant='body2'
						color='text.secondary'
						sx={{ maxWidth: 480, textAlign: 'center' }}
					>
						{this.state.message}
					</Typography>
					<Button variant='outlined' color='primary' onClick={this.handleReset}>
						Try again
					</Button>
				</Box>
			);
		}
		return this.props.children;
	}
}
